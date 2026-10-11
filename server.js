const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const activeCameras = {}; // { socketId: name }

io.on('connection', (socket) => {

    socket.on('register-camera', (cameraName) => {
        activeCameras[socket.id] = cameraName || `Câmera ${Object.keys(activeCameras).length + 1}`;
        socket.join('cameras-room');
        io.emit('update-camera-list', activeCameras);
    });

    socket.on('register-monitor', () => {
        socket.join('monitors-room');
        socket.emit('update-camera-list', activeCameras);
    });

    // Monitor pede que a câmera envie a oferta WebRTC
    socket.on('request-offer', (data) => {
        io.to(data.targetCameraId).emit('user-connected', socket.id);
    });

    socket.on('offer', (data) => {
        io.to(data.targetId).emit('offer', { offer: data.offer, senderId: socket.id });
    });

    socket.on('answer', (data) => {
        io.to(data.targetId).emit('answer', { answer: data.answer, senderId: socket.id });
    });

    socket.on('candidate', (data) => {
        io.to(data.targetId).emit('candidate', { candidate: data.candidate, senderId: socket.id });
    });

    socket.on('camera-control', (data) => {
        io.to(data.targetCameraId).emit('camera-control', data.action);
    });

    socket.on('disconnect', () => {
        if (activeCameras[socket.id]) {
            delete activeCameras[socket.id];
            io.emit('update-camera-list', activeCameras);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
