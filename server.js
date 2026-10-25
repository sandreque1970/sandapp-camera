const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, '/')));

let cameras = {}; // Guarda { socketId: name }
let monitors = new Set();

io.on('connection', (socket) => {
    console.log('Novo dispositivo conectado:', socket.id);

    // Registro da Câmera
    socket.on('register-camera', (data) => {
        const camName = (typeof data === 'object' && data.cameraName) ? data.cameraName : (data || "Câmera");
        cameras[socket.id] = camName;
        console.log(`Câmera registrada [${socket.id}]: ${camName}`);
        io.emit('update-camera-list', cameras);
    });

    // Registro do Monitor
    socket.on('register-monitor', () => {
        monitors.add(socket.id);
        socket.emit('update-camera-list', cameras);
    });

    // Pedido de oferta do Monitor para a Câmera
    socket.on('request-offer', (data) => {
        const targetCamId = data.targetCameraId || data.targetId;
        if (targetCamId && io.sockets.sockets.get(targetCamId)) {
            io.to(targetCamId).emit('request-offer', { 
                requesterId: socket.id,
                senderId: socket.id 
            });
        }
    });

    // Repasse da Oferta (Câmera -> Monitor)
    socket.on('offer', (data) => {
        const targetId = data.targetId || data.targetCameraId;
        if (targetId) {
            io.to(targetId).emit('offer', {
                offer: data.offer,
                senderId: socket.id,
                requesterId: socket.id
            });
        }
    });

    // Repasse da Resposta (Monitor -> Câmera)
    socket.on('answer', (data) => {
        const targetId = data.targetId || data.targetCameraId;
        if (targetId) {
            io.to(targetId).emit('answer', {
                answer: data.answer,
                senderId: socket.id,
                requesterId: socket.id
            });
        }
    });

    // Repasse dos Candidatos ICE (Rede P2P)
    socket.on('candidate', (data) => {
        const targetId = data.targetId || data.targetCameraId;
        if (targetId) {
            io.to(targetId).emit('candidate', {
                candidate: data.candidate,
                senderId: socket.id,
                requesterId: socket.id
            });
        }
    });

    // Controles Remotos (Alternar Câmera / Lanterna)
    socket.on('camera-control', (data) => {
        const targetCamId = data.targetCameraId || data.targetId;
        if (targetCamId) {
            io.to(targetCamId).emit('camera-control', { action: data.action });
        }
    });

    // Desconexão de Dispositivos
    socket.on('disconnect', () => {
        if (cameras[socket.id]) {
            console.log(`Câmera desconectada: ${cameras[socket.id]}`);
            delete cameras[socket.id];
            io.emit('update-camera-list', cameras);
        }
        monitors.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
