import { io } from "socket.io-client";
import config from "../config";

let socket = null;
let connectionPromise = null;

export const connectSocket = async () => {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection promise
  connectionPromise = new Promise((resolve, reject) => {
    try {
      const socketUrl = config.apiBASEURL;
      console.log("🔌 Attempting to connect socket to:", socketUrl);
      
      // If socket exists but not connected, reconnect
      if (socket && !socket.connected) {
        console.log("🔄 Reconnecting existing socket...");
        socket.connect();
      } else {
        // Create new socket
        console.log("🆕 Creating new socket connection...");
        socket = io(socketUrl, {
          transports: ["websocket", "polling"], // Add polling as fallback
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 10000,
        });
      }

      // Handle successful connection
      const onConnect = () => {
        console.log("✅ Socket connected successfully to:", socketUrl);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        connectionPromise = null;
        resolve(socket);
      };

      // Handle connection error
      const onError = (err) => {
        console.error("❌ Socket connect error:", err.message);
        console.error("   URL attempted:", socketUrl);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        connectionPromise = null;
        reject(err);
      };

      // Handle disconnection
      const onDisconnect = (reason) => {
        console.log("👋 Socket disconnected:", reason);
      };

      // If already connected, resolve immediately
      if (socket.connected) {
        console.log("✅ Socket already connected");
        connectionPromise = null;
        resolve(socket);
      } else {
        socket.on("connect", onConnect);
        socket.on("connect_error", onError);
        socket.on("disconnect", onDisconnect);
      }

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        if (!socket.connected) {
          console.error("⏱️ Socket connection timeout after 10 seconds");
          socket.off("connect", onConnect);
          socket.off("connect_error", onError);
          socket.off("disconnect", onDisconnect);
          connectionPromise = null;
          reject(new Error("Socket connection timeout after 10 seconds"));
        }
      }, 10000);
      
      // Clear timeout if connection succeeds
      socket.once("connect", () => {
        clearTimeout(timeoutId);
      });
    } catch (error) {
      console.error("❌ Error setting up socket:", error);
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionPromise = null;
    console.log("🔌 Socket manually disconnected");
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => {
  return socket && socket.connected;
};

export const waitForSocketConnection = async () => {
  if (socket && socket.connected) {
    return socket;
  }
  
  try {
    await connectSocket();
    return socket;
  } catch (error) {
    console.error("Failed to connect socket:", error);
    throw error;
  }
};
