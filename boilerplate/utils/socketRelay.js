#!/usr/bin/env node

const net = require('net');
const Yargs = require("yargs/yargs");
const server = net.createServer();

const DEFAULT_ADDRESS = '127.0.0.1';
const DEFAULT_PORT = 8001;

const argv = Yargs(Yargs.hideBin(process.argv))
.version('1.0.0')
.locale('en')
.option('address', {
    alias: 'a',
    type: 'string',
    demandOption: false,
    description: 'Interface to listen to.',
    default: DEFAULT_ADDRESS,
    defaultDescription: DEFAULT_ADDRESS
})
.option('port', {
    alias: 'p',
    type: 'number',
    demandOption: false,
    description: 'TCP port to listen to.',
    default: DEFAULT_PORT,
    defaultDescription: DEFAULT_PORT,
})
.help()
.argv;

const FULL_ADDRESS = `${argv.address}:${argv.port}`;

function genId(length) {
    // const charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charPool = 'abcdefghijklmnopqrstuvwxyz0123456789';
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
    console.log(`Connection from ${socket.remoteAddress}:${socket.remotePort}. Assigned ID: ${socket.id}\n`);

    socket.on('end', () => {
        console.log(`Closing: ${socket.id}`);
        socket.end();
    })

    socket.on('close', (hadErrors) => {
        delete socketList[socket.id];
        console.log(`Closed ${socket.id} with${hadErrors ? '' : 'out'} errors.\n`);
    })

    socket.on('error', (error) => {
        console.log(`Error: ${socket.id}\n`, error, '\n');
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
    argv.port,
    argv.address,
    printBanner,
);