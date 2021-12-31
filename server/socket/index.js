const hexgen = require("hex-generator");

const gameRooms = {
  // [roomKey]: {
  //   users: [],
  //   randomTasks: [],
  //   scores: [],
  //   gameScore: 0,
  //   players: {
  //     [socket.id]: {
  //       x: 100,
  //       y: 100,
  //       direction: "down",
  //       playerId: socket.id,
  //       username: "Name",
  //     },
  //   },
  //   numPlayers: 0
  // },
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(
      `A socket connection to the server has been made: ${socket.id}`
    );

    socket.on("joinRoom", (data) => {
      const { username, code: roomKey, sprite, peerId } = data;
      socket.join(roomKey);

      console.log("socket id", socket.id);
      console.log({ peerId });

      const roomInfo = gameRooms[roomKey];
      roomInfo.players[socket.id] = {
        x: spawnLocation(384, 168),
        y: spawnLocation(1711, 55),
        direction: "down",
        playerId: socket.id,
        username: username || `Player ${socket.id.substring(0, 5)}`,
        sprite: sprite,
        peerId,
      };

      // Update number of players
      roomInfo.numPlayers = Object.keys(roomInfo.players).length;

      // Set initial state
      socket.emit("setState", roomInfo);

      // Send the other players' data to the new player
      socket.emit("currentPlayers", {
        players: roomInfo.players,
        numPlayers: roomInfo.numPlayers,
      });

      // Update all other players of the new player
      socket.to(roomKey).emit("newPlayer", {
        playerInfo: roomInfo.players[socket.id],
        numPlayers: roomInfo.numPlayers,
      });
    });

    // Update when a player moves
    socket.on("playerMovement", (data) => {
      const { x, y, direction, roomKey } = data;
      gameRooms[roomKey].players[socket.id].x = x;
      gameRooms[roomKey].players[socket.id].y = y;
      gameRooms[roomKey].players[socket.id].direction = direction;

      // Emit moving player's position to other players
      socket
        .to(roomKey)
        .emit("playerMoved", gameRooms[roomKey].players[socket.id]);
    });

    // Update when a player stops
    socket.on("playerStopping", (data) => {
      const { x, y, roomKey } = data;
      gameRooms[roomKey].players[socket.id].x = x;
      gameRooms[roomKey].players[socket.id].y = y;

      // Emit moving player stopping
      socket
        .to(roomKey)
        .emit("playerStopped", gameRooms[roomKey].players[socket.id]);
    });

    // Player disconnect
    socket.on("disconnect", () => {
      // Find player room
      let roomKey = 0;
      for (const currentRoomKey in gameRooms) {
        const currentRoom = gameRooms[currentRoomKey];
        if (currentRoom.players.hasOwnProperty(socket.id)) {
          roomKey = currentRoomKey;
          break;
        }
      }

      const roomInfo = gameRooms[roomKey];

      if (roomInfo) {
        console.log(`User ${socket.id} disconnected from room: ${roomKey}`);
        // Remove player
        const peerId = roomInfo.players[socket.id].peerId;
        delete roomInfo.players[socket.id];
        // Update number of players
        roomInfo.numPlayers = Object.keys(roomInfo.players).length;
        // Emit to all players to remove this player
        socket.to(roomKey).emit("disconnected", {
          playerId: socket.id,
          numPlayers: roomInfo.numPlayers,
          peerId: peerId,
        });
      }
    });

    socket.on("isKeyValid", (data) => {
      const { username, code } = data;
      Object.keys(gameRooms).includes(code)
        ? socket.emit("keyIsValid", data)
        : socket.emit("keyNotValid");
    });

    // Get random code for the room
    socket.on("getRoomCode", async () => {
      const key = codeGenerator(Object.keys(gameRooms));
      gameRooms[key] = {
        roomKey: key,
        randomTasks: [],
        gameScore: 0,
        scores: {},
        players: {},
        numPlayers: 0,
        // adminId:
      };
      socket.emit("roomCreated", key);
    });

    socket.on('mute', async (kind, playerId) => {
      let roomKey = 0;
      for (const currentRoomKey in gameRooms) {
        const currentRoom = gameRooms[currentRoomKey];
        if (currentRoom.players.hasOwnProperty(socket.id)) {
          roomKey = currentRoomKey;
          break;
        }
      }

      console.log(`muting ${kind} ${playerId}`)
      socket.to(roomKey).emit('mute', kind, playerId);
    })
  });
};

function codeGenerator(keys) {
  const code = hexgen(32).slice(0, 5).toUpperCase();

  if (keys.includes(code)) {
    return codeGenerator(keys);
  }
  return code;
}

function spawnLocation(point, range) {
  const max = point + range;
  const min = point - range;
  return Math.floor(Math.random() * (max - min + 1) + min);
}
