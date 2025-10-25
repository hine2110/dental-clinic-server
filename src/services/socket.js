let io;
module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    // === THÊM LOGIC MỚI ===
    io.on("connection", (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // 1. Cho phép client (nhân viên) tham gia vào room của cơ sở
      socket.on("join_location_room", (locationId) => {
        const roomName = `location_${locationId}`;
        socket.join(roomName);
        console.log(`🧑‍💻 Client ${socket.id} joined room: ${roomName}`);
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
    // === KẾT THÚC LOGIC MỚI === 
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};