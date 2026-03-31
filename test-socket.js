const { io } = require('socket.io-client');

const SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:4000';
const EVENT_NAME = 'temperature-humidity';

console.log(`Connecting to ${SERVER_URL} and listening for "${EVENT_NAME}" events...`);

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('Socket connected. ID:', socket.id);
});

socket.on(EVENT_NAME, (payload) => {
  console.log(`[${EVENT_NAME}]`, payload);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

