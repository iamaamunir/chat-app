import { DatabaseTestManager } from "./utils/db-utils.js";
import {
  dbTestConnection,
  clearTestDatabase,
} from "../db/db-config-mongo-test.js";
import {
  createTestTable,
  insertTestChatWithMessages,
  clearTestTables,
} from "../db/db-config-postgres-test.js";
import chatModel from "../model/chat-model.js";

describe("Database Operations Tests", () => {
  let dbManager;

  beforeAll(async () => {
    dbManager = new DatabaseTestManager();
    await dbManager.setupAll();
  });

  afterAll(async () => {
    await dbManager.teardownAll();
  });

  beforeEach(async () => {
    await dbManager.cleanupAll();
  });

  describe("MongoDB Operations", () => {
    test("should save a chat to MongoDB", async () => {
      const chatData = {
        userName: "testUser",
        roomName: "testRoom",
        state: "User testUser has joined the room",
        messages: [
          { content: "Hello world!", timeStamp: new Date().toISOString() },
        ],
      };
      const result = await chatModel.create(chatData);
      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.userName).toBe("testUser");
      expect(result.roomName).toBe("testRoom");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe("Hello world!");
    });

    test("should find chats by room name", async () => {
      await chatModel.create({
        userName: "user1",
        roomName: "room1",
        state: "joined",
        messages: [],
      });
      await chatModel.create({
        userName: "user2",
        roomName: "room1",
        state: "joined",
        messages: [],
      });
      await chatModel.create({
        userName: "user3",
        roomName: "room2",
        state: "joined",
        messages: [],
      });

      const room1Chats = await chatModel.find({ roomName: "room1" });
      const room2Chats = await chatModel.find({ roomName: "room2" });

      expect(room1Chats).toHaveLength(2);
      expect(room2Chats).toHaveLength(1);
    });

    test("should update chat messages", async () => {
      const chat = await chatModel.create({
        userName: "testUser",
        roomName: "testRoom",
        state: "joined",
        messages: [],
      });

      const updatedChat = await chatModel.findOneAndUpdate(
        { _id: chat._id },
        {
          $push: {
            messages: {
              content: "New message!",
              timeStamp: new Date().toISOString(),
            },
          },
        },
        { new: true }
      );

      expect(updatedChat.messages).toHaveLength(1);
      expect(updatedChat.messages[0].content).toBe("New message!");
    });

    test("should delete a chat", async () => {
      const chat = await chatModel.create({
        userName: "testUser",
        roomName: "testRoom",
        state: "joined",
        messages: [],
      });

      await chatModel.findByIdAndDelete(chat._id);
      const deletedChat = await chatModel.findById(chat._id);

      expect(deletedChat).toBeNull();
    });
  });

  describe("PostgreSQL Operations", () => {
    test("should create tables successfully", async () => {
      const result = await dbManager.postgres.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('chats', 'messages')
      `);

      expect(result.rows).toHaveLength(2);
    });

    test("should insert a chat with messages", async () => {
      const chatData = {
        roomName: "testRoom",
        userName: "testUser",
        state: "joined",
        messages: [
          { content: "Hello from PostgreSQL!" },
          { content: "Second message" },
        ],
      };

      const chatId = await insertTestChatWithMessages(chatData);

      expect(chatId).toBeDefined();
      expect(typeof chatId).toBe("number");

      const chatResult = await dbManager.postgres.query(
        "SELECT * FROM chats WHERE id = $1",
        [chatId]
      );
      expect(chatResult.rows).toHaveLength(1);
      expect(chatResult.rows[0].roomname).toBe("testRoom");
      expect(chatResult.rows[0].username).toBe("testUser");

      const messagesResult = await dbManager.postgres.query(
        "SELECT * FROM messages WHERE chat_id = $1",
        [chatId]
      );
      expect(messagesResult.rows).toHaveLength(2);
      expect(messagesResult.rows[0].content).toBe("Hello from PostgreSQL!");
      expect(messagesResult.rows[1].content).toBe("Second message");
    });

    test("should handle empty messages array", async () => {
      const chatData = {
        roomName: "emptyRoom",
        userName: "emptyUser",
        state: "joined",
        messages: [],
      };

      const chatId = await insertTestChatWithMessages(chatData);

      expect(chatId).toBeDefined();

      const messagesResult = await dbManager.postgres.query(
        "SELECT * FROM messages WHERE chat_id = $1",
        [chatId]
      );
      expect(messagesResult.rows).toHaveLength(0);
    });

    test("should handle database transaction rollback on error", async () => {
      const invalidChatData = {
        roomName: "testRoom",
        userName: "testUser",
        state: "joined",
        messages: [{ content: null }],
      };

      await expect(
        insertTestChatWithMessages(invalidChatData)
      ).rejects.toThrow();

      const chatResult = await dbManager.postgres.query(
        "SELECT * FROM chats WHERE roomname = $1",
        ["testRoom"]
      );
      expect(chatResult.rows).toHaveLength(0);
    });
  });

  describe("Database Cleanup Utilities", () => {
    test("should clear MongoDB test data", async () => {
      await chatModel.create({
        userName: "testUser",
        roomName: "testRoom",
        state: "joined",
        messages: [],
      });

      await clearTestDatabase();
      const result = await chatModel.find({});

      expect(result).toHaveLength(0);
    });

    test("should clear PostgreSQL test data", async () => {
      await insertTestChatWithMessages({
        roomName: "testRoom",
        userName: "testUser",
        state: "joined",
        messages: [],
      });

      await clearTestTables();
      const result = await dbManager.postgres.query("SELECT * FROM chats");

      expect(result.rows).toHaveLength(0);
    });
  });
});