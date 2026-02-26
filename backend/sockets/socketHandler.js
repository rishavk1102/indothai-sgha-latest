const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
require('dotenv').config();


let io;

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            credentials: true,
            methods: ["GET", "POST"],
        },
        maxHttpBufferSize: 15 * 1024 * 1024,
    });

    // Authentication middleware removed - socket connects without auth
    io.use((socket, next) => {
        // Allow all connections without authentication
        return next();
    });


    io.on("connection", (socket) => {
        console.log(`✅ User connected: ${socket.id} (User ID: ${socket.user?.id})`);

        const eventsDir = path.join(__dirname, "events");
        if (fs.existsSync(eventsDir)) {
            fs.readdirSync(eventsDir).forEach((file) => {
                if (file.endsWith(".js")) {
                    const eventHandler = require(path.join(eventsDir, file));
                    eventHandler(io, socket); // Each handler can access socket.user
                }
            });
        }

        socket.on("disconnect", () => {
            console.log(`👋 User disconnected`);
        });
    });
}

function getIO() {
    if (!io) {
        console.warn("❌ Socket.io not initialized. Skipping emit.");
    }
    return io;
}

module.exports = initializeSocket;
module.exports.getIO = getIO;
