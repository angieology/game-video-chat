// socket connect to root path of localhost
import Peer from "peerjs";

const socket = io("/");

const myPeer = new Peer();

const videoGrid = document.getElementById("video-grid");

const myVideo = document.createElement("video");
myVideo.muted = true; // don't listen to your own video. doesn't mute for other people
myVideo.controls = true;

const peers = {};
// try to connect our video
export function openVideo() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      // tell video object to use the stream
      console.log("opening video");
      addVideoStream(myVideo, stream);

      // // RECEIVE CALLS
      // myPeer.on("call", (call) => {
      //   // when someone calls us, send them our stream (sends user B's video to our screen user A)
      //   console.log("receiving call ☎️...");
      //   call.answer(stream);

      //   // other user video stream (user A video to user B screen)
      //   const video = document.createElement("video");

      //   call.on("stream", (userVideoStream) => {
      //     addVideoStream(video, userVideoStream);

      //     // get reference to all existing user connections so we can remove videos on disconnect
      //     call.on("close", () => {
      //       video.remove();
      //     });
      //     Object.keys(myPeer.connections).forEach((userId) => {
      //       peers[userId] = call;
      //     });
      //   });
      // });

      // socket.on("user-connected", (userId) => {
      //   console.log("user connected: ", userId);
      //   connectToNewUser(userId, stream);
      // });
    });
}

socket.on("user-disconnected", (userId) => {
  console.log("disconnected: ", userId);

  if (peers[userId]) {
    peers[userId].close();
  }
});

socket.on("user-connected");

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

/**
 * make calls when new user connect to our room
 * @param {uuid} userId
 * @param {*} stream
 */
function connectToNewUser(userId, stream) {
  // send this user our video stream
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  // when they send us back their video stream, calls this event
  call.on("stream", (userVideoStream) => {
    // add to our list of videos on screen
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    console.log("hanging up user: ", userId);
    video.remove(); // cleanup video when they lave
  });
  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    // once it loads stream, play video
  });
  videoGrid.append(video);
}
