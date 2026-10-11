const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

// Armazena as câmeras ativas e seus nomes
const activeCameras = {}; // { socketId: name }

io.on('connection', (socket) => {

    // Registra uma nova câmera quando ela se conecta
    socket.on('register-camera', (cameraName) => {
        activeCameras[socket.id] = cameraName || `Câmera ${Object.keys(activeCameras).length + 1}`;
        socket.join('cameras-room');
        // Notifica todos os monitores com a lista atualizada de câmeras
        io.emit('update-camera-list', activeCameras);
    });

    // Registra um novo monitor quando ele faz login
    socket.on('register-monitor', () => {
        socket.join('monitors-room');
        // Envia a lista atual de câmeras apenas para o monitor que acabou de entrar
        socket.emit('update-camera-list', activeCameras);
    });

    // Encaminha a oferta WebRTC diretamente para o destinatário (targetId)
    socket.on('offer', (data) => {
        io.to(data.targetId).emit('offer', { offer: data.offer, senderId: socket.id });
    });

    // Encaminha a resposta WebRTC
    socket.on('answer', (data) => {
        io.to(data.targetId).emit('answer', { answer: data.answer, senderId: socket.id });
    });

    // Encaminha candidatos ICE
    socket.on('candidate', (data) => {
        io.to(data.targetId).emit('candidate', { candidate: data.candidate, senderId: socket.id });
    });

    // Encaminha comandos remotos (alternar câmera, lanterna) para uma câmera específica
    socket.on('camera-control', (data) => {
        io.to(data.targetCameraId).emit('camera-control', data.action);
    });

    // Remove a câmera da lista quando ela se desconecta
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
