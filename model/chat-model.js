import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  userName: String,
  roomName: String,
  state: String,
  messages: [
    {
      content: String,
      timeStamp: String,
    },
  ]
}, { timestamps: true }); // <-- This auto-adds createdAt and updatedAt!

const chatModel = mongoose.model("Chat", chatSchema);

export default chatModel;
