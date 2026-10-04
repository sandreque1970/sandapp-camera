const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        // Notifica a câmera enviando o ID exato deste monitor
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('offer', (data) => {
        if (data.targetId) {
            io.to(data.targetId).emit('offer', { offer: data.offer, senderId: socket.id });
        } else {
            socket.to(data.room).emit('offer', { offer: data.offer, senderId: socket.id });
        }
    });

    socket.on('answer', (data) => {
        if (data.targetId) {
            io.to(data.targetId).emit('answer', { answer: data.answer, senderId: socket.id });
        } else {
            socket.to(data.room).emit('answer', { answer: data.answer, senderId: socket.id });
        }
    });

    socket.on('candidate', (data) => {
        if (data.targetId) {
            io.to(data.targetId).emit('candidate', { candidate: data.candidate, senderId: socket.id });
        } else {
            socket.to(data.room).emit('candidate', { candidate: data.candidate, senderId: socket.id });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
