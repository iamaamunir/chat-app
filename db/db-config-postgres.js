import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();
const connectionString =
  "postgresql://postgres:postgres@postgres:5432/chat_app?sslmode=disable";

const pool = new Pool({
  connectionString,
});

const chats =
  "CREATE TABLE IF NOT EXISTS chats (ID SERIAL PRIMARY KEY, roomname VARCHAR(255) NOT NULL UNIQUE, username VARCHAR(255) NOT NULL,state VARCHAR(50)NOT NULL,  createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(), updatedAt TIMESTAMPTZ DEFAULT NOW())";

const messages =
  "CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY,chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE, content TEXT NOT NULL, createdAt TIMESTAMPTZ DEFAULT NOW())";

export const createTable = async () => {
  await pool.query(chats);
  await pool.query(messages);
  console.log("pg table created");
};

export const insertChatWithMessages = async ({
  roomName,
  userName,
  state,
  messages = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert the chat (like the "orders" table)
    const chatResult = await client.query(
      `INSERT INTO chats (room_name, user_name, state)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [roomName, userName, state]
    );

    const chatId = chatResult.rows[0].id;

    // Insert messages (like "order_items")
    for (const msg of messages) {
      await client.query(
        `INSERT INTO messages (chat_id, content, time_stamp)
         VALUES ($1, $2, $3)`,
        [chatId, msg.content, msg.timeStamp || new Date()]
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