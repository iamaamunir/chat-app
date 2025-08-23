import mongoose from "mongoose";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });
console.log("MONGODB_URI =", process.env.MONGODB_URI);

export class MongoTestUtils {
  static async connect() {
    try {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chat_app_test",
        {
          serverSelectionTimeoutMS: 5000,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );
      console.log("✅ Connected to test MongoDB");
    } catch (error) {
      console.error("❌ MongoDB test connection failed:", error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      if (mongoose.connection.readyState === 0) {
        console.log("🔌 MongoDB already disconnected");
        return;
      }
      await mongoose.connection.close();
      console.log("🔌 Disconnected from test MongoDB");
    } catch (error) {
      console.error("❌ MongoDB disconnect failed:", error);
    }
  }

  static async clearDatabase() {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("⚠️  Not connected to MongoDB, skipping clearDatabase");
        return;
      }
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      console.log("🧹 MongoDB test database cleared");
    } catch (error) {
      console.error("❌ MongoDB clear failed:", error);
      throw error;
    }
  }

  static async dropDatabase() {
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        console.warn("⚠️  Not connected to MongoDB, skipping dropDatabase");
        return;
      }
      await mongoose.connection.db.dropDatabase();
      console.log("🗑️ MongoDB test database dropped");
    } catch (error) {
      console.error("❌ MongoDB drop failed:", error);
      throw error;
    }
  }
}

export class PostgresTestUtils {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_CONNECTION_STRING,
    });
  }

  async connect() {
    try {
      await this.pool.query("SELECT NOW()");
      console.log("✅ Connected to test PostgreSQL");
    } catch (error) {
      console.error("❌ PostgreSQL test connection failed:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pool.ended) {
        console.log("🔌 PostgreSQL pool already disconnected");
        return;
      }
      await this.pool.end();
      console.log("🔌 Disconnected from test PostgreSQL");
    } catch (error) {
      console.error("❌ PostgreSQL disconnect failed:", error);
    }
  }

  async createTables() {
    const chats = `
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        roomname VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        state VARCHAR(50) NOT NULL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const messages = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    try {
      await this.pool.query(chats);
      await this.pool.query(messages);
      console.log("📋 PostgreSQL test tables created");
    } catch (error) {
      console.error("❌ PostgreSQL table creation failed:", error);
      throw error;
    }
  }

  async clearTables() {
    try {
      if (this.pool.ended) {
        console.warn("⚠️  Postgres pool already ended, skipping clearTables");
        return;
      }
      await this.pool.query(
        "TRUNCATE TABLE messages, chats RESTART IDENTITY CASCADE"
      );
      console.log("🧹 PostgreSQL test tables cleared");
    } catch (error) {
      console.error("❌ PostgreSQL clear failed:", error);
      throw error;
    }
  }

  async dropTables() {
    try {
      if (this.pool.ended) {
        console.warn("⚠️  Postgres pool already ended, skipping dropTables");
        return;
      }
      await this.pool.query("DROP TABLE IF EXISTS messages CASCADE");
      await this.pool.query("DROP TABLE IF EXISTS chats CASCADE");
      console.log("🗑️ PostgreSQL test tables dropped");
    } catch (error) {
      console.error("❌ PostgreSQL table drop failed:", error);
      throw error;
    }
  }

  async query(text, params) {
    if (this.pool.ended) {
      throw new Error("Postgres pool already ended");
    }
    return await this.pool.query(text, params);
  }
}

export class DatabaseTestManager {
  constructor() {
    this.postgres = new PostgresTestUtils();
  }

  async setupAll() {
    await MongoTestUtils.connect();
    await this.postgres.connect();
    await this.postgres.createTables();
    console.log("🚀 All test databases setup complete");
  }

  async cleanupAll() {
    await MongoTestUtils.clearDatabase();
    await this.postgres.clearTables();
    console.log("🧹 All test databases cleaned");
  }

  async teardownAll() {
    await MongoTestUtils.dropDatabase();
    await this.postgres.dropTables();
    await MongoTestUtils.disconnect();
    await this.postgres.disconnect();
    console.log("🔥 All test databases torn down");
  }
}