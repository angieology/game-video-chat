const videoGrid = document.getElementById("video-grid");

const [myVideo, myVideoContainer] = createVideoContainer(true, -1)
let mySocket;

const peers = {};
// try to connect our video
function openVideo(socket, myPeer) {
  mySocket = socket;
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      // tell video object to use the stream
      addVideoStream(myVideoContainer, myVideo, stream);

      // RECEIVE CALLS
      myPeer.on("call", (call) => {
        // when someone calls us, send them our stream (sends user B's video to our screen user A)
        console.log("receiving call ☎️...");
        call.answer(stream);
        // other user video stream (user A video to user B screen)
        const [video, videoContainer] = createVideoContainer(false, -1)

        call.on("stream", (userVideoStream) => {
          addVideoStream(videoContainer, video, userVideoStream);

          // get reference to all existing user connections so we can remove videos on disconnect
          call.on("close", () => {
            videoContainer.remove();
          });
          Object.keys(myPeer.connections).forEach((peerId) => {
            peers[peerId] = call;
            peers[peerId].video = video;
          });
        });
      });

      socket.on("startCall", (peerId) => {
        if (peers[peerId]) {
          peers[peerId].video.classList.remove("hidden");
        }
      });

      socket.on("disconnected", (userData) => {
        const { peerId } = userData;

        if (peers[peerId]) {
          peers[peerId].close();
        }
      });

      socket.on("endCall", (peerId) => {
        if (peers[peerId]) {
          peers[peerId].video.classList.add("hidden");
        }
      });
      socket.on('mute', (kind, playerId) => {
        console.log("Received message")
        console.log("socket id" + socket.id)
        console.log("playerid" + playerId)
        if(socket.id !== playerId) return
        myVideo.srcObject.getTracks().forEach(t => {
          if (t.kind == kind) {
            t.enabled = !t.enabled
          }
        })

      socket.on("newPlayer", (userData) => {
        const {
          playerInfo: { peerId },
        } = userData;
        connectToNewUser(myPeer, peerId, stream);
      });
    });
}

/**
 * make calls when new user connect to our room
 * @param {uuid} peerId
 * @param {*} stream
 */
function connectToNewUser(myPeer, peerId, stream, playerId) {
  // send this user our video stream
  const call = myPeer.call(peerId, stream);
  const [video, videoContainer] = createVideoContainer(false, playerId)
  // when they send us back their video stream, calls this event
  call.on("stream", (userVideoStream) => {
    // add to our list of videos on screen
    addVideoStream(videoContainer, video, userVideoStream);
  });
  call.on("close", () => {
    console.log("hanging up user: ", peerId);
    videoContainer.remove(); // cleanup video when they lave
  });
  peers[peerId] = call;
  peers[peerId].video = video;
}

function addVideoStream(videoContainer, video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadeddata", () => {
    // once it loads stream, play video
    video.play();
  });
  video.addEventListener("loadedmetadata", () => {
    video.play();
    // once it loads stream, play video
  });
  videoGrid.append(videoContainer);
}

let toggleMedia = (playerId, btn, k) => myVideo.srcObject.getTracks().forEach(t => {
  // t.kind == k && t.stop()
  if (t.kind == k) {
    if (playerId !== -1) {
      mySocket.emit('mute', k, playerId)
    } else {
      t.enabled = !t.enabled
    }
    const mediaType = t.kind.charAt(0).toUpperCase() + t.kind.slice(1)
    const [currentText, _] = btn.innerHTML.split(" ");
    const updateText = currentText === 'Stop' ? 'Start' : 'Stop';
    btn.innerHTML = `${updateText} ${mediaType}`;
  }
});

function createVideoContainer(isSelfVideo, playerId) {
  const videoContainer = document.createElement('div');
  const video = document.createElement("video");
  const videoControls = document.createElement("div");
  videoControls.className = "video-controls";
  video.muted = isSelfVideo; // don't listen to your own video. doesn't mute for other people
  video.controls = false;
  videoContainer.append(video)
  videoContainer.append(videoControls);
  const videoButton = document.createElement('button');
  videoButton.innerHTML = "Stop Video"
  videoButton.onclick = () => toggleMedia(playerId, videoButton, 'video')
  videoControls.append(videoButton)
  const audioButton = document.createElement('button');
  audioButton.innerHTML = "Stop Audio"
  audioButton.onclick = () => toggleMedia(playerId, audioButton, 'audio')
  videoControls.append(audioButton)

  // if(isSelfVideo) {
  //   const muteAll = document.createElement('button')
  //   muteAll.innerHTML = "Mute Others"
  //   muteAll.onclick = () => muteOthers();
  //   videoContainer.append(muteAll);
  // }

  return [video, videoContainer];
}

export default openVideo;
