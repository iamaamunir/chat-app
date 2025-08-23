import request from "supertest";
import { app } from "../index.js";
import { DatabaseTestManager } from "./utils/db-utils.js";
import chatModel from "../model/chat-model.js";

describe("API Endpoints Tests", () => {
  let dbManager;

  beforeAll(async () => {
    dbManager = new DatabaseTestManager();
    await dbManager.setupAll();
  }, 60000);

  afterAll(async () => {
    await dbManager.teardownAll();
  }, 60000);

  beforeEach(async () => {
    await dbManager.cleanupAll();
  }, 30000);

  describe("Database-Dependent API Tests", () => {
    describe("GET /api/chat/:roomName", () => {
      test("should return empty array when no chats exist", async () => {
        const response = await request(app).get("/api/chat/nonexistent-room");
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      }, 10000);

      test("should return chats for a specific room", async () => {
        const roomName = "test-room";
        await chatModel.create({
          userName: "user1",
          roomName: roomName,
          state: "joined",
          messages: [
            { content: "Hello!", timeStamp: new Date().toISOString() },
          ],
        });
        await chatModel.create({
          userName: "user2",
          roomName: roomName,
          state: "joined",
          messages: [
            { content: "Hi there!", timeStamp: new Date().toISOString() },
          ],
        });
        await chatModel.create({
          userName: "user3",
          roomName: "different-room",
          state: "joined",
          messages: [],
        });

        const response = await request(app).get(`/api/chat/${roomName}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].roomName).toBe(roomName);
        expect(response.body[1].roomName).toBe(roomName);

        const firstChatTime = new Date(response.body[0].createdAt);
        const secondChatTime = new Date(response.body[1].createdAt);
        expect(firstChatTime.getTime()).toBeLessThanOrEqual(
          secondChatTime.getTime()
        );
      }, 15000);

      test("should handle room names with special characters", async () => {
        const roomName = "room-with-special-chars";
        await chatModel.create({
          userName: "testUser",
          roomName: roomName,
          state: "joined",
          messages: [],
        });

        const encodedRoomName = encodeURIComponent(roomName);
        const response = await request(app).get(`/api/chat/${encodedRoomName}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].roomName).toBe(roomName);
      }, 10000);
    });

    describe("Database Integration", () => {
      test("should handle database connection gracefully", async () => {
        const response = await request(app).get("/api/chat/test-room");
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }, 10000);
    });
  });
});