#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const t2lib = require('@affidaty/t2-lib');
const publishConfig = require('./publishConfig.json');
const publishMetadata = require('./publishMetadata.json');
const HashList = require('./include/hashlist').HashList;

async function testConnection(client) {
    const serviceAccData = await client.accountData(client.serviceAccount);
}

async function main() {
    process.stdout.write("Connecting to TRINCI node...\n");
    process.stdout.write(`URL:     [${publishConfig.nodeUrl}]\n`);
    process.stdout.write(`NETWORK: [${publishConfig.network}]\n`);
    const client = new t2lib.Client(publishConfig.nodeUrl, publishConfig.network);
    await testConnection(client);
    process.stdout.write("Connection successful.\n");
    process.stdout.write('\n');
    const publisherAcc = new t2lib.Account();
    if (typeof publishConfig.publishPrivKeyB58 == 'string' && publishConfig.publishPrivKeyB58.length > 0) {
        process.stdout.write("Importing publisher key...\n");
        const publisherPrivKey = new t2lib.ECDSAKey('private');
        await publisherPrivKey.importBin(
            new Uint8Array(
                t2lib.binConversions.base58ToArrayBuffer(
                    publishConfig.publishPrivKeyB58,
                ),
            ),
        )
        await publisherAcc.setPrivateKey(publisherPrivKey);
    } else {
        process.stdout.write("Generating new publisher...\n");
        await publisherAcc.generate();
    }
    process.stdout.write(`PUBLISHER: [${publisherAcc.accountId}]\n`);
    process.stdout.write('\n');
    process.stdout.write('Publishing...\n');

    const scBin = new Uint8Array(fs.readFileSync(path.resolve(__dirname, publishConfig.wasmPath)));
    const scName = publishMetadata.name;
    const scVersion = `${publishMetadata.version}-${new Date().getTime()}`;
    const scDescription = publishMetadata.description;
    const scUrl = publishMetadata.url;

    const publishTx = new t2lib.UnitaryTransaction();
    publishTx.data.accountId = client.serviceAccount;
    publishTx.data.maxFuel = 1000;
    publishTx.data.genNonce();
    publishTx.data.networkName = client.network;
    publishTx.data.smartContractMethod = 'contract_registration';
    publishTx.data.smartContractMethodArgs = {
        name: scName,
        version: scVersion,
        description: scDescription,
        url: scUrl,
        bin: Buffer.from(scBin),
    };
    await publishTx.sign(publisherAcc.keyPair.privateKey);

    const publishTicket = await client.submitTx(publishTx);
    process.stdout.write(`PUBLISH TICKET: [${publishTicket}]\n`);
    process.stdout.write('Waiting for transaction to be executed...\n');
    let publishReceipt = await client.waitForTicket(
        publishTicket,
        publishConfig.pollingMaxTries,
        publishConfig.pollingSleepMs,
    );
    let hashString;

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

main();
