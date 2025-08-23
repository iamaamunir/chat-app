import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { dirname, join } from "path";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dbConnection } from "./db/db-config-mongo.js";
import chatModel from "./model/chat-model.js";
import {
  createTable,
  insertChatWithMessages,
} from "./db/db-config-postgres.js";
import { mongo } from "mongoose";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.get("/api/chat/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;
    const chats = await chatModel.find({ roomName }).sort({ createdAt: 1 });
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

dbConnection();
createTable();

async function saveToBothDatabases(roomName, userName, state, messages = []) {
  const errors = [];
  let mongoResult = null;
  let postgresResult = null;

  try {
    mongoResult = await chatModel.create({
      userName: userName,
      roomName: roomName,
      state: state,
      messages: messages,
    });
    console.log("saved to mongo", mongoResult._id);
  } catch (error) {
    console.error("error saving to mongodb", error);
    errors.push({ database: "MongoDB", error: error.message });
  }

  try {
    postgresResult = await insertChatWithMessages({
      roomName,
      userName,
      state,
      messages,
    });
    console.log("saved to postgresql");
  } catch (error) {
    console.error("postgresql save failed", error);
    errors.push({ database: "PostgreSQL", error: error.message });
  }

  return {
    success: errors.length === 0,
    errors,
    results: {
      mongo: mongoResult,
      postgres: postgresResult,
    },
  };
}

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle joining a room. Server listens for joinRoom event and creates the room
  socket.on("joinRoom", async (roomName, userName) => {
    console.log(`User: ${userName} joined room: ${roomName}`);
    const saveResult = await saveToBothDatabases(
      roomName,
      userName,
      `user ${userName} has joined the room`,
      []
    );

    if (!saveResult.success) {
      console.error("Database save errors:", saveResult.errors);
      // Still allow the user to join even if database save fails
    }
    socket.join(roomName);

    // Notify room members. Tells other connected users to another user has joined on the event of userJoined
    socket.to(roomName).emit("userJoined", {
      userName: userName,
      roomName: roomName,
      message: `User ${userName} has joined the room`,
    });
  });

  // // Handle messages in room. listens for sendMessage event, then emit to every tser in that room on the revievedMessage event
  socket.on("sendMessage", async ({ roomName, userName, message }) => {
    const updatedDoc = await chatModel.findOneAndUpdate(
      { userName, roomName },
      {
        $set: {
          messages: { content: message, timeStamp: new Date().toISOString() },
        },
      },
      { new: true }
    );

    if (!updatedDoc) {
      throw new Error("User not found in room");
    }
    socket.to(roomName).emit("recievedMessage", {
      userName,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
}


export { app, httpServer, io, saveToBothDatabases };
