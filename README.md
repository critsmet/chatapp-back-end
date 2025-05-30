# ChatApp: The Back End

The back end of ChatApp is built with [Express](https://github.com/expressjs/express), [SocketIO](https://github.com/socketio/socket.io), and access to a TURN server provided by [Twilio](https://github.com/twilio). An infinite amount of chat users can join four user live streams and interact in real time. The live app is hosted by Render [here](https://chatapp-front-end-zfdy.onrender.com) (please allow a few minutes for app to spin up).

## Installing & Running Locally

After forking and cloning the repo to your computer, ```cd``` into the directory in your terminal and run ```npm install```. If you haven't already forked, cloned, and started the frontend application, visit the repository at [this link](https://github.com/critsmet/chatapp-front-end) for setup instructions. Run ```node app.js``` to launch the application locally.

This application uses WebRTC technology, and requires that RTCPeerConnections are established successfully through communication by released ICE candidates. If you're running the front and back ends of this application on your local network, you should have no problem using [public STUN servers](https://gist.github.com/zziuni/3741933).

## TURN Servers and Deploying

When hosting your application and expecting connections to be made across disparate networks, TURN servers are recommended. Read more about this [here](https://www.callstats.io/blog/2017/10/26/turn-webrtc-products).

This application uses the TURN server available through a subscription to [Twilio](https://www.twilio.com/stun-turn). Using the [dotenv](https://github.com/motdotla/dotenv) node package, configure your ```.env``` file to look as follows:

```
TWILIO_SSID=SSID_GOES_HERE
TWILIO_TOKEN=TOKEN_GOES_HERE
```

Or, if your environments variables are determined through your hosting provider, be sure to establish them there.

## Routes to Configure Application State

A route has been established to configure the state of the application when it's visited by directly typing the URL into the address bar of your browser.

```/clear-messages``` will clear the messages stored in an array in the application.
