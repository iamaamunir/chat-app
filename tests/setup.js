import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set longer timeout for integration tests
jest.setTimeout(60000); // Increased to 60 seconds

// Global test setup
beforeAll(async () => {
  console.log("🧪 Setting up test environment...");
});

afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  // Give time for connections to close
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

// Mock console methods in tests to reduce noise
if (process.env.NODE_ENV === "test") {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep error logs for debugging
  };
}
