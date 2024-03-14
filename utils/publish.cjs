#!/usr/bin/env node

const fs = require('fs');
const Path = require('path');
const Yargs = require("yargs/yargs");
const t2lib = require('@affidaty/t2-lib');
const HashList = require('./include/hashlist.cjs').HashList;

const DEFAULT_NETWORK = 'QmNiibPaxdU61jSUK35dRwVQYjF9AC3GScWTRzRdFtZ4vZ';
const DEFAULT_PUBLISH_ACC_FILE = './publishAccount.json';
const DEFAULT_METADATA_FILE = './publishMetadata.json';


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
    default: DEFAULT_PUBLISH_ACC_FILE,
    description: 'Absolute or relative path. If specified, account from this file will be used to sign the publish transaction',
    defaultDescription: `"${DEFAULT_PUBLISH_ACC_FILE}"`
})
.option('generatePublisher', {
    alias: 'G',
    type: 'boolean',
    demandOption: false,
    description: 'If set, a random one-time account will be generated to be used during publication. If set, this option overrides the given publisher key, if any. To save for a later use, set the --savePublisher(a.k.a "-P") option with desired path.',
})
.option('savePublisher', {
    alias: 'P',
    type: 'string',
    demandOption: false,
    description: 'Absolute or relative path. In case no publisher account was provided to this script ("--publisherAccount" or "-p" option) and this option is set, generated publisher account will be saved to the provided path. If file exists, an error will be raised.',
})
.option('metadataFile', {
    alias: 'm',
    type: 'string',
    demandOption: false,
    default: DEFAULT_METADATA_FILE,
    description: 'Absolute or relative path to file containig smart contract metadata.',
    defaultDescription: `"${DEFAULT_METADATA_FILE}"`
})
.option('url', {
    alias: 'u',
    type: 'string',
    demandOption: false,
    description: 'If provided, this script will try to submit the transaction to a node on the specified url. Implies that "port" and "bridgePort" options are also set.',
})
.option('txOutFile', {
    alias: 't',
    type: 'string',
    demandOption: false,
    description: 'Absolute or relative path. If provided, serialized signed publish transaction will be saved in binary format to that path. File will be replaced if already exists.',
})
.option('info', {
    alias: 'i',
    type: 'boolean',
    demandOption: false,
    description: 'Allows to just print smart contract and publlisher info without actually submitting publish transaction.',
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
    return Path.resolve(`./${filePath}`);
}

/**
 * 
 * @param {string} path 
 * @returns {t2lib.Account}
 */
async function loadPublisherAccount(filePath) {
    const absPath = absolutizePath(filePath);
    if (!fs.existsSync(absPath)) {
        throw new Error(`File \"${absPath}\" not found.`);
    }
    const accDataObj = JSON.parse(fs.readFileSync(absPath));
    if (!accDataObj.privateKey || typeof accDataObj.privateKey !== "string" || !accDataObj.privateKey.length) {
        process.stderr.write(`Unable to get publisher private key from ${absPath}\n`);
        process.stderr.write(`Check if file exists, is readable and contains a valid JSON object with "privateKey" member.\n`);
        process.stderr.write(`Otherwise it is possible to generate a new key on-site using "-G" option.\nSave generated key using "-P" option\n\n`);
        throw new Error(`\"privateKey\" member not found or not a string in ${absPath}.`);
    }
    const account = new t2lib.Account();
    const privKey = new t2lib.ECDSAKey('private');
    await privKey.importBin(t2lib.base58Decode(accDataObj.privateKey));
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
 * @returns {Uint8Array}
 */
function loadWasmFile(filePath) {
    return new Uint8Array(fs.readFileSync(absolutizePath(filePath)));
}

/**
 * @param {Uint8Array} wasmBytes
 * @return {string}
 */

function getWasmRefHash(wasmBytes) {
    return `1220${t2lib.hexEncode(t2lib.Utils.sha256(wasmBytes))}`;
}

/**
 * 
 * @param {string} filePath 
 * @param {Uint8Array} bytes 
 */
function saveBytesToFile(filePath, bytes) {
    fs.writeFileSync(absolutizePath(filePath), Buffer.from(bytes));
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
    const jsonObj = {
        "accountId": account.accountId,
        "publicKey": t2lib.base58Encode(await account.keyPair.publicKey.getRaw()),
        "privateKey": t2lib.base58Encode(await account.keyPair.privateKey.getPKCS8()),
    };
    const absPath = absolutizePath(filePath);
    if (fs.existsSync(absPath)) {
        process.stderr.write(`${absPath} already exists. Won't overwrite it for security reasons. Move the file or rename it.\n\n`);
        throw new Error(`${absPath} already exists.`);
    }
    fs.writeFileSync(absPath, JSON.stringify(jsonObj, null, 4));
}

async function main() {

    const metadata = loadMetadata(argv.metadataFile);
    const wasmBytes = loadWasmFile(metadata.wasmFile);
    const wasmRefHash = getWasmRefHash(wasmBytes);

    let publisherAccount = new t2lib.Account();
    let genPublisherSaveFile = './generatedPublisher.json';
    if (!argv.generatePublisher && argv.publisherAccount && argv.publisherAccount.length > 0) {
        if (Array.isArray(argv.publisherAccount)) {
            argv.publisherAccount = argv.publisherAccount[argv.publisherAccount.length - 1]
        }
        publisherAccount = await loadPublisherAccount(argv.publisherAccount);
    } else {
        await publisherAccount.generate();
        if(typeof argv.savePublisher === 'string') {
            if (argv.savePublisher.length > 0) {
                genPublisherSaveFile = argv.savePublisher;
            }
            saveAccountToFile(genPublisherSaveFile, publisherAccount);
        }
    }

    const publishTxNetwork = argv.network || DEFAULT_NETWORK;
    const publishTx = new t2lib.UnitaryTransaction()
    .genNonce()
    .setMaxFuel(1000)
    .setNetworkName(publishTxNetwork)
    .setTarget('TRINCI')
    .setSmartContractMethod('contract_registration')
    .setSmartContractMethodArgs({
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        url: metadata.url,
        bin: wasmBytes,
    })
    await publishTx.sign(publisherAccount.keyPair.privateKey);

    if(!await publishTx.verify()) {
        throw new Error('Could not verify signed publish transaction.');
    }
    process.stdout.write(`\nPublisher:      [${publisherAccount.accountId}]\n`);
    process.stdout.write(`Contract hash:  [${wasmRefHash}]\n`);
    process.stdout.write(`Metadata:\n${JSON.stringify(metadata, null, 4)}\n`);
    if (!argv.info) {
        process.stdout.write(`Pub tx hash:    [${ await publishTx.getTicket()}]\n`);
    }
    process.stdout.write('\n');

    if (argv.txOutFile) {
        saveBytesToFile(argv.txOutFile, await publishTx.toBytes());
    }

    if (argv.url && !argv.info) {
        process.stdout.write("Connecting to TRINCI node...\n");
        process.stdout.write(`Network:        [${publishTx.data.networkName}]\n`);
        process.stdout.write(`Url:            [${argv.url}]\n`);
        const client = new t2lib.Client(argv.url, publishTx.data.networkName);
        // client.timeout = 100;
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
        process.stdout.write(`\n${metadata.name}: ${hashString}\n`);
    } else {
        if (!argv.info) {
            process.stdout.write('\nPublish transaction won\'t be submitted as url was not provided.');
            process.stdout.write('\nPlease provide node url ("-u" or "--url" option) to submit publish transaction.\n\n');
        }
    }
    return true;
}

main();
