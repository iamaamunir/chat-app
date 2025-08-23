import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.test" });

const connectionString =
  process.env.POSTGRES_CONNECTION_STRING ||
  "postgresql://postgres:postgres@localhost:5432/chat_app_test?sslmode=disable";

const pool = new Pool({
  connectionString,
});

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

export const createTestTable = async () => {
  try {
    await pool.query(chats);
    await pool.query(messages);
    console.log("PostgreSQL test tables created");
  } catch (error) {
    console.error("Error creating test tables:", error);
    throw error;
  }
};

export const insertTestChatWithMessages = async ({
  roomName,
  userName,
  state,
  messages = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const chatResult = await client.query(
      `INSERT INTO chats (roomname, username, state)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [roomName, userName, state]
    );

    const chatId = chatResult.rows[0].id;

    for (const msg of messages) {
      await client.query(
        `INSERT INTO messages (chat_id, content)
         VALUES ($1, $2)`,
        [chatId, msg.content]
      );
    }

    await client.query("COMMIT");
    return chatId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const clearTestTables = async () => {
  try {
    await pool.query("TRUNCATE TABLE messages, chats RESTART IDENTITY CASCADE");
    console.log("Test tables cleared");
  } catch (error) {
    console.error("Error clearing test tables:", error);
    throw error;
  }
};

export const getTestPool = () => pool;
