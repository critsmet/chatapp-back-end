import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import twilio from "twilio";
import { config } from "dotenv";
config();

import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Message,
  User,
} from "./types";

const accountSid = process.env.TWILIO_SSID;
const authToken = process.env.TWILIO_TOKEN;
const twilioAuth = twilio(accountSid, authToken);

twilioAuth.tokens.create().then(async ({ iceServers }) => {
  const app = express();

  const corsOrigin =
    process.env.NODE_ENV === "production"
      ? "https://chatapp-front-end-zfdy.onrender.com"
      : "http://localhost:5173";

  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", corsOrigin);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

  const expressServer = http.createServer(app);

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    expressServer,
    {
      pingTimeout: 60000,
      cors: {
        origin: corsOrigin,
      },
    }
  );

  const port = process.env.PORT || 4001;
  const router = express.Router();
  app.use(router);

  let users: User[] = [];
  let messages: Message[] = [];
  let activeBroadcasters: string[] = []; // Track who is currently broadcasting

  router.get("/clear-messages", (req, res) => {
    messages = [];
    console.log("Messages cleared");
    res
      .send({
        response: "messages cleared",
      })
      .status(202);
  });

  router.get("/debug", (req, res) => {
    res.json({
      users: users.length,
      activeBroadcasters: activeBroadcasters.length,
      messages: messages.length,
    });
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    socket.emit("connectSuccess", iceServers, users, messages);

    socket.on("initializeSession", (username) => {
      const user: User = {
        socketId: socket.id,
        username: username,
      };
      
      socket.emit("initializedSession", user);
      users.push(user);
      socket.broadcast.emit("userJoin", user);
      
      console.log(`User ${user.username} (${socket.id}) has joined. Total users: ${users.length}`);
    });

    socket.on("disconnect", () => {
      const disconnectedUser = users.find((user) => user.socketId === socket.id);
      
      if (disconnectedUser) {
        users = users.filter((user) => user.socketId !== socket.id);
        activeBroadcasters = activeBroadcasters.filter((id) => id !== socket.id);
        socket.broadcast.emit("userLogout", disconnectedUser);
        console.log(`User ${disconnectedUser.username} (${socket.id}) has disconnected. Total users: ${users.length}`);
      } else {
        console.log(`Unknown socket disconnected: ${socket.id}`);
      }
    });

    socket.on("sendMessage", (text) => {
      const user = users.find((user: User) => user.socketId === socket.id);
      
      if (user) {
        const message: Message = {
          username: user.username,
          message: text,
        };
        
        messages.push(message);
        io.emit("newMessage", message);
        
        console.log(`Message from ${user.username}: ${text}`);
      } else {
        console.log(`Couldn't find user with socketId ${socket.id} for message`);
      }
    });

    socket.on("requestBroadcast", () => {
      console.log(`Broadcast requested by ${socket.id}`);
      
      if (activeBroadcasters.length >= 4) {
        socket.emit("broadcastRequestResponse", { approved: false });
        console.log(`Broadcast denied - max limit reached (${activeBroadcasters.length}/4)`);
        return;
      }
      
      if (activeBroadcasters.includes(socket.id)) {  
        socket.emit("broadcastRequestResponse", { approved: false });
        console.log(`Broadcast denied - user ${socket.id} already broadcasting`);
        return;
      }
      
      activeBroadcasters.push(socket.id);
      socket.emit("broadcastRequestResponse", { approved: true });
      
      console.log(`Broadcast approved for ${socket.id}. Active broadcasters: ${activeBroadcasters.length}/4`);
    });

    socket.on("offer", (targetSocketId, description) => {
      console.log(`Offer from ${socket.id} to ${targetSocketId}`);
      socket.to(targetSocketId).emit("offer", socket.id, description);
    });

    socket.on("answer", (targetSocketId, description) => {
      console.log(`Answer from ${socket.id} to ${targetSocketId}`);
      socket.to(targetSocketId).emit("answer", socket.id, description);
    });

    socket.on("candidate", (targetSocketId, candidate) => {
      console.log(`ICE candidate from ${socket.id} to ${targetSocketId}`);
      socket.to(targetSocketId).emit("candidate", socket.id, candidate);
    });

    socket.on("endBroadcast", () => {
      activeBroadcasters = activeBroadcasters.filter((id) => id !== socket.id);
      socket.broadcast.emit("broadcastEnded", socket.id);
      
      console.log(`Broadcast ended by ${socket.id}. Active broadcasters: ${activeBroadcasters.length}/4`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });

    socket.on("connectionFailed", (targetSocketId) => {
      console.log(`Connection failed between ${socket.id} and ${targetSocketId}`);
    });
  });

  process.on('SIGTERM', () => {
    console.log('Server shutting down gracefully...');
    io.close(() => {
      expressServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  });

  expressServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`CORS origin: ${corsOrigin}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('Failed to initialize Twilio tokens:', error);
  process.exit(1);
});