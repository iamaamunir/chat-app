import mongoose from "mongoose";
import dotenv from 'dotenv'

export function dbConnection() {
  mongoose.connect(process.env.MONGODB_URI);
  mongoose.connection.on("connected", () => {
    console.log("Connection to MongoDB is successful");
  });
  mongoose.connection.on("error", (err) => {
    console.log("Unable to Connect to MongoDB", err);
  });
}

// export default dbConnection;
