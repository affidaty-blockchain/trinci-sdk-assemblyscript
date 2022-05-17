#!/usr/bin/env node

const fs = require('fs');
const Path = require('path');
const AdmZip = require("adm-zip");
const Yargs = require("yargs/yargs");
const t2lib = require('@affidaty/t2-lib');
const HashList = require('./include/hashlist').HashList;
const submit = require('./include/submit');

const DEFAULT_NETWORK = 'QmNiibPaxdU61jSUK35dRwVQYjF9AC3GScWTRzRdFtZ4vZ';
const DEFAULT_MAIN_NETWORK = 'mainnet';
const DEFAULT_PUBLISH_ACC_FILE = './publishAccount.json';
const DEFAULT_METADATA_FILE = './publishMetadata.json';
const DEFAULT_PUBLISH_TX_FILE = './publishTx.bin';
const DEFAULT_PREAPPROVE_ARCHIVE_FILE = './preapprove.trinci';
const DEFAULT_REST_PORT = 8000;
const DEFAULT_BRIDGE_PORT = 8001;
const AFFIDATY_BASE_URL = "http://localhost:3000";
const DEFAULT_AFFIDATY_PREAUTH_URL = `${AFFIDATY_BASE_URL}/api/authIn/preAuth`;
const DEFAULT_AFFIDATY_SIGN_URL = `${AFFIDATY_BASE_URL}/api/authIn/sign`;
const DEFAULT_AFFIDATY_PREAPPROVE_URL_BASE = `${AFFIDATY_BASE_URL}/api/v1/preappove`;


const argv = Yargs(Yargs.hideBin(process.argv))
.version('1.0.0')
.locale('en')
.option('network', {
    alias: 'n',
    type: 'string',
    demandOption: false,
    description: 'Network ID to which publish transaction will be submitted.',
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
.option('zip', {
    alias: 'z',
    type: 'string',
    demandOption: false,
    description: 'Allows to create an archive to send to Affidaty for preapproval of the smart contract for it\'s publish in mainnet. Archive will contail following data: \"assembly\" dir with source code; \"test\" dir to better understand your code; your project\'s \"package.json\" for all the dependencies and a file containing publish transaction with your smart contract signed by your publisher private key. As soon as your smart contract is approved for publish to our main network, this transaction will be used to actually publish it.',
})
.option('sendPreapprove', {
    alias: 's',
    type: 'boolean',
    demandOption: false,
    description: 'Allows to create (same as "-z"/"--zip" option) and automatically send a preapproval archive to Affidaty (see the "-z" optio help for info on it\'s content). ',
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
 * @returns {Buffer}
 */
function getBufferFromFile(filePath) {
    return fs.readFileSync(absolutizePath(filePath));
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

/**
 * 
 * @param {string} filePath 
 */
function removeFile(filePath) {
    fs.unlinkSync(absolutizePath(filePath));
}

/**
 * 
 * @param {string} zipFilePath 
 * @param {string} publishTxFilePath 
 */

async function createPreappArchive(zipOutFile, pubTxOutFile) {
    const absZipOutFile = absolutizePath(zipOutFile);
    const zip = new AdmZip();

    zip.addLocalFolder(absolutizePath('./assembly'), './assembly');
    zip.addLocalFolder(absolutizePath('./test'), './test');

    zip.addLocalFile(absolutizePath('./asconfig.json'));
    zip.addLocalFile(absolutizePath('./msgpackable.js'));
    zip.addLocalFile(absolutizePath('./package.json'));
    zip.addLocalFile(absolutizePath(pubTxOutFile), undefined, "publishTx.bin");

    zip.writeZip(absZipOutFile);

    process.stdout.write(`Preapprove archive saved to ${absZipOutFile}\n`);
}

async function main() {

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
    publishTx.data.networkName = DEFAULT_NETWORK;
    publishTx.data.smartContractMethod = 'contract_registration';
    publishTx.data.smartContractMethodArgs = {
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        url: metadata.url,
        bin: wasmBytes,
    };
    if (argv.sendPreapprove) {
        publishTx.data.networkName = DEFAULT_MAIN_NETWORK;
    }
    if (argv.network) {
        publishTx.data.networkName = argv.network;
    }
    await publishTx.sign(publisherAccount.keyPair.privateKey);

    if(!await publishTx.verify()) {
        throw new Error('Could not verify signed publish transaction.');
    }

    process.stdout.write(`Network:        [${publishTx.data.networkName}]\n`);
    process.stdout.write(`Publisher:      [${publisherAccount.accountId}]\n`);
    process.stdout.write(`Contract hash:  [${wasmRefHash}]\n`);
    process.stdout.write(`Metadata:\n${JSON.stringify(metadata, null, 4)}\n`);
    process.stdout.write(`Pub tx hash:    [${ await publishTx.getTicket()}]\n`);
    const publishTxBytes = Buffer.from(await publishTx.toBytes());

    if (argv.txOutFile) {
        saveBufferToFile(argv.txOutFile, publishTxBytes);
    }

    if (argv.zip || argv.sendPreapprove) {
        let zipFile = argv.zip;
        if (!zipFile) {
            zipFile = DEFAULT_PREAPPROVE_ARCHIVE_FILE;
        }
        let txFile = argv.txOutFile;
        let rmTxFile = false;
        if (!txFile) {
            txFile = DEFAULT_PUBLISH_TX_FILE;
            saveBufferToFile(txFile, publishTxBytes);
            rmTxFile = true;
        }
        createPreappArchive(zipFile, txFile);
        if (rmTxFile) {
            removeFile(txFile);
        }
        if (argv.sendPreapprove) {
            throw new Error("Cannot submit preapprove request. Service not yet active.");
            process.stdout.write(`Sending ${zipFile} to ${DEFAULT_AFFIDATY_PREAPPROVE_URL_BASE}/submit ...\n`);
            const authHeader = await submit.signIn(
                DEFAULT_AFFIDATY_PREAUTH_URL,
                DEFAULT_AFFIDATY_SIGN_URL,
                publisherAccount
            );
            const archiveBytes = getBufferFromFile(zipFile);
            const submitResponse = await submit.submitForPreapproval(
                `${DEFAULT_AFFIDATY_PREAPPROVE_URL_BASE}/submit`,
                archiveBytes,
                authHeader,
            );
            const ticket = JSON.parse(Buffer.from(submitResponse).toString());
            if (typeof ticket !== "string") {
                process.stdout.write(JSON.stringify(ticket, null, 4));
                process.stdout.write('\n');
            } else {
                process.stdout.write(`Preapprove request ticket:\n[${ticket}]\n`);
                process.stdout.write(`Check status on the following url:\n${DEFAULT_AFFIDATY_PREAPPROVE_URL_BASE}/status?ticket=${ticket}\n\n`);
            }
        }
    }

    if (argv.url) {
        process.stdout.write("Connecting to TRINCI node...\n");
        process.stdout.write(`Url:            [${argv.url}]\n`);
        const client = new t2lib.Client(argv.url, publishTx.data.networkName);
        await testConnection(client);
        process.stdout.write("Connection successful.\n");
        process.stdout.write('\n');
        const publishTicket = await client.submitTx(publishTx);
        process.stdout.write(`Pub tx ticket:  [${publishTicket}]\n`);
        process.stdout.write('Waiting for transaction to be executed...\n');
        let publishReceipt = await client.waitForTicket(publishTicket, 100, 1000);
        if (publishReceipt.success) {
            process.stdout.write('Execution successful.\n');
            hashString = t2lib.Utils.bytesToObject(publishReceipt.result);
            const hashList = new HashList();
            hashList.save(metadata.name, hashString);
        } else {
            process.stdout.write('Execution error.\n');
            hashString = Buffer.from(publishReceipt.result).toString();
        }
        console.log(`${metadata.name}: ${hashString}`);
    }
    return true;
}

main();
