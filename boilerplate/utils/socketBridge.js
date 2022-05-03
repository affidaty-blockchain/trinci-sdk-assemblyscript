const uniqid = require('uniqid');
const net = require('net');
const server = net.createServer();
let sockets = {};

const PORT = process.argv[2] || 3000;
const ADDRESS = '127.0.0.1';
const FULL_ADDRESS = `${ADDRESS}:${PORT}`;

server.on('connection', (socket) => {

  socket.id = uniqid();
  console.log(`New socket client id=${socket.id}`);
  socket.on('data', (data) => {
    Object.keys(sockets).forEach((id) => {
        const otherUser = sockets[id];
        // broadcast
        if (socket.id !== id) {
          otherUser.write(data);
        }
      });
  });

  socket.on('end', () => {
    delete sockets[socket.id];
    console.log(`${socket.id} end.`);
  })
});

server.listen(
  PORT,
  ADDRESS,
  () => console.log(`
  ==================================

   +++ TRINCI socket bridge ON +++  

  Adress: ${FULL_ADDRESS}

  ==================================
  `)
);