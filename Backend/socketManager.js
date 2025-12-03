// Manejo simple de salas con códigos de 6 dígitos usando socket.io
module.exports = function(io) {
  const rooms = {}; // { code: { players: [socketId, ...] } }

  function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  io.on('connection', (socket) => {
    console.log('Socket conectado:', socket.id, 'desde', socket.handshake.address);

    socket.on('create_room', (cb) => {
      let code;
      do {
        code = generateCode();
      } while (rooms[code]);

      rooms[code] = { players: [socket.id] };
      socket.join(code);
      socket.roomCode = code;

      console.log(`Sala creada ${code} por ${socket.id}`);
      if (typeof cb === 'function') cb({ success: true, code });
      io.to(code).emit('room_created', { code });
    });

    socket.on('join_room', (data, cb) => {
      const code = (data && data.code) ? data.code.toString() : null;
      if (!code || !rooms[code]) {
        if (typeof cb === 'function') cb({ success: false, message: 'Sala no encontrada.' });
        return;
      }

      const room = rooms[code];
      if (room.players.length >= 2) {
        if (typeof cb === 'function') cb({ success: false, message: 'Sala llena.' });
        return;
      }

      room.players.push(socket.id);
      socket.join(code);
      socket.roomCode = code;

      console.log(`${socket.id} se unió a la sala ${code}`);
      if (typeof cb === 'function') cb({ success: true, code });
      io.to(code).emit('player_joined', { players: room.players.length });
    });

    // Evento genérico de juego para reenviar al otro jugador en la misma sala
    socket.on('game_event', (payload) => {
      const code = socket.roomCode;
      if (!code) return;
      socket.to(code).emit('game_event', payload);
    });

    socket.on('disconnect', () => {
      const code = socket.roomCode;
      console.log('Socket desconectado:', socket.id, 'sala:', code);
      if (code && rooms[code]) {
        rooms[code].players = rooms[code].players.filter(id => id !== socket.id);
        if (rooms[code].players.length === 0) {
          delete rooms[code];
          console.log(`Sala ${code} eliminada (vacía)`);
        } else {
          io.to(code).emit('player_left');
        }
      }
    });
  });
};
