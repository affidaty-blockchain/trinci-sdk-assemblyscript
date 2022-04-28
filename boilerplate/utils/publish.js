#!/usr/bin/env node

const fs = require('fs');
const Path = require('path');
const t2lib = require('@affidaty/t2-lib');
const HashList = require('./include/hashlist').HashList;
const Yargs = require("yargs/yargs");

const DEFAULT_NETWORK = 'QmNiibPaxdU61jSUK35dRwVQYjF9AC3GScWTRzRdFtZ4vZ';
const DEFAULT_PUBLISH_ACC = './publishAccount.json';
const DEFAULT_METADATA_FILE = './publishMetadata.json';
const DEFAULT_REST_PORT = 8000;
const DEFAULT_BRIDGE_PORT = 8001;

const argv = Yargs(Yargs.hideBin(process.argv))
.version('1.0.0')
.locale('en')
.option('network', {
    alias: 'n',
    type: 'string',
    demandOption: false,
    description: 'Network ID to which publish transaction will be submitted.',
    default: DEFAULT_NETWORK,
    defaultDescription: `"${DEFAULT_NETWORK}"`,
})
.option('publisherAccount', {
    alias: 'p',
    type: 'string',
    demandOption: false,
    description: 'Path. If specified, account from this file will be used to sign the publish transaction. If missing, a random account will be generated.',
})
.option('savePublisher', {
    alias: 'P',
    type: 'string',
    demandOption: false,
    description: 'Path. In case no publisher account was provided to this script ("--publisherAccount" or "-p" option) and this option is set, generated publisher account will be saved to the provided path. If file exists, an error will be raised.',
})
.option('metadataFile', {
    alias: 'm',
    type: 'string',
    demandOption: false,
    default: DEFAULT_METADATA_FILE,
    description: 'Path to file containig smart contract metadata.',
    defaultDescription: `"${DEFAULT_METADATA_FILE}"`
})
.option('restPort', {
    alias: 'r',
    type: 'number',
    demandOption: false,
    description: 'Rest interface port of the node specified in the "url" option. Must be set along with "url" option.',
    default: DEFAULT_REST_PORT,
    defaultDescription: DEFAULT_REST_PORT,
})
.option('bridgePort', {
    alias: 'b',
    type: 'number',
    demandOption: false,
    description: 'Bridge(socket) interface port of the node specified in the "url" option. Must be set along with "url" option.',
    default: DEFAULT_BRIDGE_PORT,
    defaultDescription: DEFAULT_BRIDGE_PORT,
})
.option('url', {
    alias: 'u',
    type: 'string',
    demandOption: false,
    description: 'If provided, this script will try to submit the transaction to a node on the specified url. Implies that "port" and "bridgePort" options are also set.',
    implies: ['restPort', 'bridgePort'],
})
.option('txOutFile', {
    alias: 't',
    type: 'string',
    demandOption: false,
    description: 'Path. If provided, serialized signed publish transaction will be saved as Base58 string to that path. File will be replaced if already exists.',
})
.help()
.argv;

async function testConnection(client) {
    const serviceAccData = await client.accountData(client.serviceAccount);
}

/**
 * 
 * @param {string} path 
 * @returns {string}
 */
function absolutizePath(filePath) {
    if (filePath.charAt(0) === '/') {
        return filePath;
    }
    return Path.resolve(__dirname, `../${filePath}`);
}

/**
 * 
 * @param {string} path 
 * @returns {t2lib.Account}
 */
async function loadPublisherAccount(filePath) {
    const absPath = absolutizePath(filePath);
    const accDataObj = JSON.parse(fs.readFileSync(absPath));
    if (!accDataObj.privateKey || typeof accDataObj.privateKey !== "string") {
        throw new Error(`\"privateKey\" member not found or not a string in ${absPath}.`);
    }
    const privKeyBytes = new Uint8Array(t2lib.binConversions.base58ToArrayBuffer(accDataObj.privateKey));
    const privKey = new t2lib.ECDSAKey('private');
    await privKey.importBin(privKeyBytes);
    const account = new t2lib.Account();
    await account.setPrivateKey(privKey);
    return account;
}

/**
 * 
 * @param {string} filePath 
 * @returns {{
 *  name: string,
 *  version: string,
 *  description: string,
 *  url: string,
 *  wasmFile: string,
 * }}
 */

function loadMetadata(filePath) {
    const absPath = absolutizePath(filePath);
    const metadataObj = JSON.parse(fs.readFileSync(absPath));

    if (typeof metadataObj.name !== 'string'
        || typeof metadataObj.version !== 'string'
        || typeof metadataObj.description !== 'string'
        || typeof metadataObj.url !== 'string'
        || typeof metadataObj.wasmFile !== 'string'
    ) {
        throw new Error(`Invalid metadata in ${absPath}. Required fields(all strings): name, version, description, url, wasmFile.`);
    }
    return metadataObj;
}

/**
 * 
 * @param {string} path 
 * @returns {Buffer}
 */
function loadWasmFile(filePath) {
    return fs.readFileSync(absolutizePath(filePath));
}

/**
 * @param {Buffer} wasmBytes
 * @return {string}
 */

function getWasmRefHash(wasmBytes) {
    return `1220${Buffer.from(t2lib.Utils.sha256(new Uint8Array(wasmBytes))).toString('hex')}`;
}

/**
 * 
 * @param {string} filePath 
 * @param {Buffer} buffer 
 */
function saveBufferToFile(filePath, bytes) {
    fs.writeFileSync(absolutizePath(filePath), bytes);
}

/**
 * 
 * @param {string} filePath 
 * @param {t2lib.Account} account
 */
async function saveAccountToFile(filePath, account) {
    const absPath = absolutizePath(filePath);
    const jsonObj = {
        "accountId": account.accountId,
        "publicKey": t2lib.binConversions.arrayBufferToBase58((await account.keyPair.publicKey.getRaw()).buffer),
        "privateKey": t2lib.binConversions.arrayBufferToBase58((await account.keyPair.privateKey.getPKCS8()).buffer)
    }
    if (fs.existsSync(absPath)) {
        throw new Error(`${absPath} already exists.`);
    }
    fs.writeFileSync(absPath, JSON.stringify(jsonObj, null, 4));
}

async function main() {
    // console.log(argv);

    const metadata = loadMetadata(argv.metadataFile);
    const wasmBytes = loadWasmFile(metadata.wasmFile);
    const wasmRefHash = getWasmRefHash(wasmBytes);

    let publisherAccount = new t2lib.Account();
    if (argv.publisherAccount) {
        publisherAccount = await loadPublisherAccount(argv.publisherAccount);
    } else {
        await publisherAccount.generate();
        if (argv.savePublisher) {
            await saveAccountToFile(argv.savePublisher, publisherAccount);
        }
    }

    const publishTx = new t2lib.UnitaryTransaction();
    publishTx.data.accountId = 'TRINCI';
    publishTx.data.maxFuel = 1000;
    publishTx.data.genNonce();
    publishTx.data.networkName = argv.network;
    publishTx.data.smartContractMethod = 'contract_registration';
    publishTx.data.smartContractMethodArgs = {
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        url: metadata.url,
        bin: wasmBytes,
    };
    await publishTx.sign(publisherAccount.keyPair.privateKey);

    if(!await publishTx.verify()) {
        throw new Error('Could not verify signed publish transaction.');
    }

    process.stdout.write(`Network:        [${argv.network}]\n`);
    process.stdout.write(`Publisher:      [${publisherAccount.accountId}]\n`);
    process.stdout.write(`Contract hash:  [${wasmRefHash}]\n`);
    process.stdout.write(`Metadata:\n${JSON.stringify(metadata, null, 4)}\n`);
    process.stdout.write(`Pub tx hash:    [${ await publishTx.getTicket()}]\n`);

    if (argv.txOutFile) {
        const txBytes = Buffer.from(await publishTx.toBytes());
        saveBufferToFile(argv.txOutFile, txBytes)
    }

    if (argv.url) {
        process.stdout.write("Connecting to TRINCI node...\n");
        process.stdout.write(`Url:            [${argv.url}]\n`);
        process.stdout.write(`Rest:           [${argv.restPort}]\n`);
        process.stdout.write(`Bridge:         [${argv.bridgePort}]\n`);
        const client = new t2lib.BridgeClient(argv.url, argv.restPort, argv.bridgePort, argv.network);
        await client.connectSocket();
        await client.subscribe('SDK_PUBLISH_SCRIPT', ['block']);
        await testConnection(client);
        process.stdout.write("Connection successful.\n");
        process.stdout.write('\n');
        const publishTicket = await client.submitTx(publishTx);
        process.stdout.write(`Pub tx ticket:  [${publishTicket}]\n`);
        process.stdout.write('Waiting for transaction to be executed...\n');
        let publishReceipt = await client.waitForTicket(publishTicket);
        if (publishReceipt.success) {
            process.stdout.write('Execution successful.\n');
            hashString = t2lib.Utils.bytesToObject(publishReceipt.result);
            const hashList = new HashList();
            hashList.save(scName, hashString);
        } else {
            process.stdout.write('Execution error.\n');
            hashString = Buffer.from(publishReceipt.result).toString();
        }
        console.log(`${scName}: ${hashString}`);
    }
    return true;
}

main();
