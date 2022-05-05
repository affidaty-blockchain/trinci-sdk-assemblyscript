#!/usr/bin/env node

const net = require('net');
const server = net.createServer();

const PORT = 8001;
const ADDRESS = '127.0.0.1';
const FULL_ADDRESS = `${ADDRESS}:${PORT}`;

function genId(length) {
    const charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charPoolLen = charPool.length;
    let result = '';
    for ( let i = 0; i < length; i++ ) {
        result += charPool.charAt(Math.floor(Math.random() * charPoolLen));
    }
    return result;
}

let socketList = {};

server.on('connection', (socket) => {
    socket.id = genId(5);
    socketList[socket.id] = socket;
    console.log(`Connection from ${socket.remoteAddress}:${socket.remotePort}. Saved as ${socket.id}\n`);

    socket.on('end', () => {
        console.log(`Closing: ${socket.id}`);
        socket.end();
    })

    socket.on('close', (hadErrors) => {
        delete socketList[socket.id];
        console.log(`Closed ${socket.id} with${hadErrors ? '' : 'out'} errors.`);
    })

    socket.on('error', (error) => {
        console.log(`Error: ${socket.id}\n`, error);
    })

    socket.on('data', (data) => {
        console.log(`Data from ${socket.id}:\n[${data.toString('hex')}]\n`);
        Object.keys(socketList).forEach((id) => {
            if (socket.id !== id) {
                console.log(`Relaying data from ${socket.id} to ${id}\n`)
                socketList[id].write(data);
            }
        });
    });
});

const printBanner = () => {
    const serverBanner = `╔════════════════════════╗\n║ TRINCI socket relay ON ║\n╚════════════════════════╝\n  Address: ${FULL_ADDRESS}\n\n`;
    console.log(serverBanner);
};

server.listen(
    PORT,
    ADDRESS,
    printBanner,
);