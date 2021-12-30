const videoGrid = document.getElementById("video-grid");

const [myVideo, myVideoContainer] = createVideoContainer(true)

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
      addVideoStream(myVideoContainer, myVideo, stream);

      // RECEIVE CALLS
      myPeer.on("call", (call) => {
        // when someone calls us, send them our stream (sends user B's video to our screen user A)
        console.log("receiving call ☎️...");
        call.answer(stream);

        // other user video stream (user A video to user B screen)
        const [video, videoContainer] = createVideoContainer(false)

        call.on("stream", (userVideoStream) => {
          addVideoStream(videoContainer, video, userVideoStream);

          // get reference to all existing user connections so we can remove videos on disconnect
          call.on("close", () => {
            videoContainer.remove();
          });
          Object.keys(myPeer.connections).forEach((peerId) => {
            peers[peerId] = call;
          });
        });
      });

      socket.on("newPlayer", (userData) => {
        console.log(userData);
        const { playerInfo: { peerId } } = userData;
        console.log("newPlayer: ", peerId);
        connectToNewUser(myPeer, peerId, stream);
      });

      socket.on("disconnected", (userData) => {
        const { playerInfo: { peerId } } = userData;
        console.log("disconnected: ", peerId);
      
        if (peers[peerId]) {
          peers[userId].close();
        }
      });
    });
}

// myPeer.on("open", (id) => {
//   socket.emit("join-room", ROOM_ID, id);
// });

/**
 * make calls when new user connect to our room
 * @param {uuid} userId
 * @param {*} stream
 */
function connectToNewUser(myPeer, userId, stream) {
  // send this user our video stream
  const call = myPeer.call(userId, stream);
  const [video, videoContainer] = createVideoContainer(false)
  // when they send us back their video stream, calls this event
  call.on("stream", (userVideoStream) => {
    // add to our list of videos on screen
    addVideoStream(videoContainer, video, userVideoStream);
  });
  call.on("close", () => {
    console.log("hanging up user: ", userId);
    videoContainer.remove(); // cleanup video when they lave
  });
  peers[userId] = call;
}

function addVideoStream(videoContainer, video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
    // once it loads stream, play video
  });
  videoGrid.append(videoContainer);
}

let toggleMedia = (btn, k) => myVideo.srcObject.getTracks().forEach(t => {
  // t.kind == k && t.stop()
  if (t.kind == k) {
    t.enabled = !t.enabled
    const mediaType = t.kind.charAt(0).toUpperCase() + t.kind.slice(1)
    console.log(`${t.enabled ? 'Stop' : 'Start'} ${mediaType}`)
    btn.innerHTML = `${t.enabled ? 'Stop' : 'Start'} ${mediaType}`
  }
});

function createVideoContainer(isSelfVideo) {
  const videoContainer = document.createElement('div');
  const video = document.createElement("video");
  video.muted = isSelfVideo; // don't listen to your own video. doesn't mute for other people
  video.controls = false;
  videoContainer.append(video)
  const videoButton = document.createElement('button');
  videoButton.innerHTML = "Stop Video"
  videoButton.onclick = () => toggleMedia(videoButton, 'video')
  videoContainer.append(videoButton)
  const audioButton = document.createElement('button');
  audioButton.innerHTML = "Stop Audio"
  audioButton.onclick = () => toggleMedia(audioButton, 'audio')
  videoContainer.append(audioButton)

  // if(isSelfVideo) {
  //   const muteAll = document.createElement('button')
  //   muteAll.innerHTML = "Mute Others"
  //   muteAll.onclick = () => muteOthers();
  //   videoContainer.append(muteAll);
  // }

  return [video, videoContainer];
}
