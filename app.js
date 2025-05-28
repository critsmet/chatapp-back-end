const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
require('dotenv').config();

const accountSid = process.env.TWILIO_SSID ;
const authToken = process.env.TWILIO_TOKEN
const twilioTokens = require('twilio')(accountSid, authToken);

twilioTokens.tokens.create().then(obj => {

  let iceServersArray = obj.iceServers

  const app = express();

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.NODE_ENV === 'production' ? "https://capable-biscochitos-fab766.netlify.app" : "http://localhost:5173"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  const server = http.createServer(app);

  const io = socketIo(server, {
    pingTimeout: 60000,
    cors: {
      origin: "http://localhost:5173"
  }
});

  const port = process.env.PORT || 4001;

  const router = express.Router();
  let users = []
  let messages = []
  let broadcasts = []

  router.get("/clear-messages", (req, res) => {
    messages = []
    console.log("Messages cleared");
    res.send({
      response: "messages cleared"
    }).status(202)
  })


  app.use(router);

  io.on("connection", socket => {
    socket.emit("connected", iceServersArray, users)

    socket.on("callUser", call => {
      io.to(call.socketId).emit('incomingCall', {
        signal: call.data, 
        from: call.from
      })
    })

    socket.emit("iceServers", iceServersArray)
    socket.emit("loggedInUsers",  users)

    socket.on("initializeSession", username => {
      let user = {
        socketId: socket.id, 
        username: username
      }
      socket.emit("initializedSession", user, messages)
      users.push(user)
      socket.broadcast.emit("newUserJoin", user)
      console.log(`User ${user.username} has joined`)
    })


    socket.on("disconnect", () => {
      users = users.filter(user => {
        if(user.socketId === socket.id){
          socket.broadcast.emit("userLogout", user)
          return false
        } else {
          return true
        }
      })
      broadcasts = broadcasts.filter(broadcast => broadcast !== socket.id)
      console.log(`User ${user.username} has disconnected`);
    });

    socket.on("sentMessage", (text) => {
      let user = users.find(user => user.socketId === socket.id)
      let message = {
        username: user.username, 
        message: text
      }
      messages.push(message)
      io.emit("newMessage", message)
      console.log("Message sent", { message })
    })

    socket.on("requestBroadcast", () => {
      console.log("Requesting broadcast");
      if (broadcasts.length === 4 || broadcasts.find(broadcastSocketId => broadcastSocketId === socket.id)){
        socket.emit("broadcastRequestResponse", {approved: false})
      } else {
        broadcasts.push(socket.id)
        socket.emit("broadcastRequestResponse", {approved: true})
      }
    })

    socket.on("offer", (watcherSocketId, description) => {
      socket.to(watcherSocketId).emit("offer", socket.id, description)
    })

    socket.on("answer", (broadcasterSocketId, description) => {
      socket.to(broadcasterSocketId).emit("answer", socket.id, description)
    })

    socket.on("candidate", (id, sender, candidate) => {
      socket.to(id).emit("candidate", socket.id, sender, candidate);
    })

    socket.on("endBroadcast", () => {
      broadcasts = broadcasts.filter(broadcast => broadcast !== socket.id)
      socket.broadcast.emit("broadcastEnded", socket.id)
    })
  })

  server.listen(port, () => console.log(`Listening on port ${port}`));
})
