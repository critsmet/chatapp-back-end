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
    res.header("Access-Control-Allow-Origin", corsOrigin); // update to match the domain you will make the request from
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
  let broadcasts: string[] = [];

  router.get("/clear-messages", (req, res) => {
    messages = [];
    console.log("Messages cleared");
    res
      .send({
        response: "messages cleared",
      })
      .status(202);
  });

  io.on("connection", (socket) => {
    socket.emit("connectSuccess", iceServers, users, messages);

    socket.on("initializeSession", (username) => {
      let user = {
        socketId: socket.id,
        username: username,
      };
      socket.emit("initializedSession", user);
      users.push(user);
      socket.broadcast.emit("userJoin", user);
      console.log(`User ${user.username} has joined`);
    });

    socket.on("disconnect", () => {
      users = users.filter((user) => {
        if (user.socketId === socket.id) {
          socket.broadcast.emit("userLogout", user);
          console.log(`User ${user.username} has disconnected`);
          return false;
        } else {
          return true;
        }
      });
      broadcasts = broadcasts.filter((broadcast) => broadcast !== socket.id);
    });

    socket.on("sendMessage", (text) => {
      let user = users.find((user: User) => user.socketId === socket.id);
      if (user) {
        let message = {
          username: user.username,
          message: text,
        };
        messages.push(message);
        io.emit("newMessage", message);
        console.log("Message sent", { message });
      }
      console.log(`Couldn't find user with socketId ${socket.id}`);
    });

    socket.on("requestBroadcast", () => {
      console.log("Requesting broadcast");
      if (
        broadcasts.length === 4 ||
        broadcasts.find((broadcastSocketId) => broadcastSocketId === socket.id)
      ) {
        socket.emit("broadcastRequestResponse", { approved: false });
      } else {
        broadcasts.push(socket.id);
        socket.emit("broadcastRequestResponse", { approved: true });
      }
    });

    socket.on("offer", (watcherSocketId, description) => {
      socket.to(watcherSocketId).emit("offer", socket.id, description);
    });

    socket.on("answer", (broadcasterSocketId, description) => {
      socket.to(broadcasterSocketId).emit("answer", socket.id, description);
    });

    socket.on("candidate", (id, candidate, fromWatcher) => {
      socket.to(id).emit("candidate", socket.id, candidate, fromWatcher);
    });

    socket.on("endBroadcast", () => {
      broadcasts = broadcasts.filter((broadcast) => broadcast !== socket.id);
      socket.broadcast.emit("broadcastEnded", socket.id);
    });
  });

  expressServer.listen(port, () => console.log(`Listening on port ${port}`));
});
