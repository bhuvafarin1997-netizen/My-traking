const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Live Tracker</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100%; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        const markers = {};

        if (navigator.geolocation) {
            navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude } = position.coords;
                socket.emit("send-location", { latitude, longitude });
            }, (err) => console.error(err), {
                enableHighAccuracy: true, timeout: 5000, maximumAge: 0
            });
        }

        socket.on("receive-location", (data) => {
            const { id, latitude, longitude } = data;
            map.setView([latitude, longitude], 16);
            if (markers[id]) {
                markers[id].setLatLng([latitude, longitude]);
            } else {
                markers[id] = L.marker([latitude, longitude]).addTo(map);
            }
        });

        socket.on("user-disconnected", (id) => {
            if (markers[id]) {
                map.removeLayer(markers[id]);
                delete markers[id];
            }
        });
    </script>
</body>
</html>
    `);
});

io.on("connection", (socket) => {
    socket.on("send-location", (data) => {
        io.emit("receive-location", { id: socket.id, ...data });
    });
    socket.on("disconnect", () => {
        io.emit("user-disconnected", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
