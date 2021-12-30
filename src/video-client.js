const videoGrid = document.getElementById("video-grid");

const myVideo = document.createElement("video");
myVideo.muted = true; // don't listen to your own video. doesn't mute for other people
myVideo.controls = true;

const peers = {};
// try to connect our video
export function openVideo(socket, myPeer) {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      // tell video object to use the stream
      console.log("opening video");
      addVideoStream(myVideo, stream);

      // RECEIVE CALLS
      myPeer.on("call", (call) => {
        // when someone calls us, send them our stream (sends user B's video to our screen user A)
        console.log("receiving call ☎️...");
        call.answer(stream);

        // other user video stream (user A video to user B screen)
        const video = document.createElement("video");

        call.on("stream", (userVideoStream) => {
          addVideoStream(video, userVideoStream);

          // get reference to all existing user connections so we can remove videos on disconnect
          call.on("close", () => {
            video.remove();
          });
          Object.keys(myPeer.connections).forEach((peerId) => {
            peers[peerId] = call;
          });
        });
      });

      socket.on("videoCall", (userData) => {
        console.log(userData);
        const { playerInfo: { peerId } } = userData;
        console.log("videoCall: ", peerId);
        connectToNewUser(myPeer, peerId, stream);
      });

      socket.on("disconnected", (userData) => {
        const { peerId } = userData;
        console.log("disconnected: ", peerId);
      
        if (peers[peerId]) {
          peers[peerId].close();
        }
      });

      socket.on("stopCall", (userData) => {
        const { playerInfo: { peerId } } = userData;
        console.log("stopCall: ", peerId);
      
        if (peers[peerId]) {
          peers[peerId].close();
        }
      });
    });
}

export function stopVideo(peerId) {
  console.log("stop video: ", peerId)
  if (peers[peerId]) {
    console.log("stop video...")
    peers[peerId].close();
  }
}

/**
 * make calls when new user connect to our room
 * @param {uuid} userId
 * @param {*} stream
 */
function connectToNewUser(myPeer, userId, stream) {
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
