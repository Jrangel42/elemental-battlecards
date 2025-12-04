// Manejo simple de salas con códigos de 6 dígitos usando socket.io
module.exports = function(io) {
  const rooms = {}; // { code: { players: [{socketId, role}, ...], gameState: {} } }

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

      rooms[code] = { 
        players: [{ socketId: socket.id, role: 'host' }],
        gameState: {
          currentTurn: 'host', // El anfitrión empieza
          turnNumber: 0
        }
      };
      socket.join(code);
      socket.roomCode = code;
      socket.playerRole = 'host';

      console.log(`Sala creada ${code} por ${socket.id} (host)`);
      if (typeof cb === 'function') cb({ success: true, code, role: 'host' });
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

      room.players.push({ socketId: socket.id, role: 'guest' });
      socket.join(code);
      socket.roomCode = code;
      socket.playerRole = 'guest';

      console.log(`${socket.id} se unió a la sala ${code} (guest)`);
      if (typeof cb === 'function') cb({ success: true, code, role: 'guest' });
      
      // Notificar a ambos jugadores que la sala está completa y puede comenzar
      io.to(code).emit('player_joined', { 
        players: room.players.length,
        canStart: room.players.length === 2
      });
      
      // Si ya hay 2 jugadores, iniciar el juego
      if (room.players.length === 2) {
        io.to(code).emit('game_start', {
          currentTurn: 'host',
          hostId: room.players[0].socketId,
          guestId: room.players[1].socketId
        });
      }
    });

    // Evento genérico de juego para reenviar al otro jugador en la misma sala
    socket.on('game_event', (payload) => {
      const code = socket.roomCode;
      if (!code || !rooms[code]) return;
      
      // Reenviar el evento a todos excepto al emisor
      socket.to(code).emit('game_event', payload);
      
      console.log(`Evento ${payload.type} reenviado en sala ${code}`);
    });

    // Evento de cambio de turno
    socket.on('end_turn', (payload) => {
      const code = socket.roomCode;
      if (!code || !rooms[code]) return;
      
      const room = rooms[code];
      const currentRole = socket.playerRole;
      
      // Alternar turno
      room.gameState.currentTurn = currentRole === 'host' ? 'guest' : 'host';
      room.gameState.turnNumber++;
      
      // Notificar a ambos jugadores del cambio de turno
      io.to(code).emit('turn_changed', {
        currentTurn: room.gameState.currentTurn,
        turnNumber: room.gameState.turnNumber
      });
      
      console.log(`Turno cambiado en sala ${code}: ahora es turno de ${room.gameState.currentTurn}`);
    });

    socket.on('disconnect', () => {
      const code = socket.roomCode;
      console.log('Socket desconectado:', socket.id, 'sala:', code);
      if (code && rooms[code]) {
        rooms[code].players = rooms[code].players.filter(p => p.socketId !== socket.id);
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
