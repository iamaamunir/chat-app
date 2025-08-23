import { io as Client } from "socket.io-client";

export class SocketTestUtils {
  constructor() {
    this.clients = [];
  }

  // Create a new socket client for testing
  createClient(port = 3001, options = {}) {
    const client = Client(`http://localhost:${port}`, {
      autoConnect: false,
      ...options,
    });

    this.clients.push(client);
    return client;
  }

  // Connect a client and wait for connection
  async connectClient(client) {
    return new Promise((resolve, reject) => {
      client.on("connect", () => {
        resolve(client);
      });

      client.on("connect_error", (error) => {
        reject(error);
      });

      client.connect();

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 5000);
    });
  }

  // Wait for a specific event on a client
  waitForEvent(client, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      client.once(eventName, (...args) => {
        clearTimeout(timer);
        resolve(args);
      });
    });
  }

  // Join a room with a client
  async joinRoom(client, roomName, userName) {
    client.emit("joinRoom", roomName, userName);
    // Wait for confirmation or any related events
    return this.waitForEvent(client, "userJoined", 3000).catch(() => {
      // It's ok if userJoined doesn't come back for the same user
      return null;
    });
  }

  // Send a message from a client
  sendMessage(client, data) {
    client.emit("sendMessage", data);
  }

  // Disconnect and cleanup all clients
  async cleanup() {
    const disconnectPromises = this.clients.map((client) => {
      return new Promise((resolve) => {
        if (client.connected) {
          client.on("disconnect", resolve);
          client.disconnect();
        } else {
          resolve();
        }
      });
    });

    await Promise.all(disconnectPromises);
    this.clients = [];
  }
}

// Helper function to create multiple connected clients
export async function createConnectedClients(count = 2, port = 3001) {
  const socketUtils = new SocketTestUtils();
  const clients = [];

  for (let i = 0; i < count; i++) {
    const client = socketUtils.createClient(port);
    await socketUtils.connectClient(client);
    clients.push(client);
  }

  return { clients, socketUtils };
}
