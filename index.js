import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { dirname, join } from "path";
import path from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dbConnection } from "./db/db-config.js";
import chatModel from "./model/chat-model.js";

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
    await chatModel.create({
      userName: userName,
      roomName: roomName,
      state: `User ${userName} has joined the room`,
      message: [],
    });
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

httpServer.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});

dbConnection();
