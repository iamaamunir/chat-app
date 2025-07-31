import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  roomName: { type: String },
  userName: { type: String },
  state: { type: String },
  messages: [
    {
      content: String,
      timeStamp: Date,
    },
  ],
});

const chatModel = mongoose.model("Chat", chatSchema);

export default chatModel;
