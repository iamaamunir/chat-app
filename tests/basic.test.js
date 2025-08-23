import { DatabaseTestManager } from "./utils/db-utils.js";

describe("Test Infrastructure Verification", () => {
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

  test("should have Jest configured correctly", () => {
    expect(true).toBe(true);
    expect(process.env.NODE_ENV).toBe("test");
  });

  test("should connect to test MongoDB", async () => {
    expect(process.env.MONGODB_URI).toBeDefined();
    expect(process.env.MONGODB_URI).toContain("chat_app_test");
  });

  test("should connect to test PostgreSQL", async () => {
    const result = await dbManager.postgres.query("SELECT NOW()");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].now).toBeInstanceOf(Date);
  });

  test("should have PostgreSQL tables created", async () => {
    const result = await dbManager.postgres.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages')
    `);

    expect(result.rows).toHaveLength(2);
    const tableNames = result.rows.map((row) => row.table_name);
    expect(tableNames).toContain("chats");
    expect(tableNames).toContain("messages");
  });

  test("environment variables should be loaded", () => {
    expect(process.env.POSTGRES_CONNECTION_STRING).toBeDefined();
    expect(process.env.MONGODB_URI).toBeDefined();
    expect(process.env.NODE_ENV).toBe("test");
  });
});