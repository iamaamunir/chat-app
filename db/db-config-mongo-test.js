import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export function dbTestConnection() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chat_app_test";

  return new Promise((resolve, reject) => {
    mongoose.connect(mongoUri);

    mongoose.connection.on("connected", () => {
      console.log("Connection to test MongoDB is successful");
      resolve();
    });

    mongoose.connection.on("error", (err) => {
      console.log("Unable to Connect to test MongoDB", err);
      reject(err);
    });
  });
}

export const clearTestDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    console.log("Test MongoDB database cleared");
  } catch (error) {
    console.error("Error clearing test database:", error);
    throw error;
  }
};

export const closeTestConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log("Test MongoDB connection closed");
  } catch (error) {
    console.error("Error closing test connection:", error);
    throw error;
  }
};
