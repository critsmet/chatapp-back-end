import { ApiV2010AccountTokenIceServers } from "twilio/lib/rest/api/v2010/account/token";

export type ServerToClientEvents = {
  connectSuccess: (
    servers: ApiV2010AccountTokenIceServers[],
    users: User[],
    messages: Message[]
  ) => void;
  initializedSession: (user: User) => void;
  disconnect: () => void;
  error: (error: string) => void;
  newMessage: (message: Message) => void;
  userLogout: (user: User) => void;
  answer: (socketId: string, description: RTCSessionDescription) => void;
  candidate: (
    socketId: string,
    candidate: RTCIceCandidate,
    fromWatcher: boolean
  ) => void;
  broadcastEnded: (socketId: string) => void;
  userJoin: (user: User) => void;
  offer: (socketId: string, description: RTCSessionDescriptionInit) => void;
  broadcastRequestResponse: ({
    approved,
  }: {
    approved: boolean;
  }) => Promise<void>;
};

export type ClientToServerEvents = {
  initializeSession: (username: string) => void;
  candidate: (
    socketId: string,
    candidate: RTCIceCandidate,
    fromWatcher: boolean
  ) => void;
  answer: (socketId: string, description: RTCSessionDescription) => void;
  offer: (socketId: string, description: RTCSessionDescription) => void;
  sendMessage: (message: string) => void;
  requestBroadcast: () => void;
  endBroadcast: () => void;
};

// app types

export type User = {
  socketId: string;
  username: string;
};

export type Message = {
  username: string;
  message: string;
};

export type Stream = {
  socketId: string;
  stream: MediaStream;
  spot: number;
};

export type Connection = {
  socketId: string;
  connection: RTCPeerConnection;
};
