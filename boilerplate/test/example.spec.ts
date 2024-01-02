import path from 'path';
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/ts_jest';
import t2libcore from '@affidaty/t2-lib-core';

const wasmPath = './build/release.wasm';
let wasmFileHash = '';
describe('d1', () => {
    test('t1', async () => {
        const node = new TrinciNode();
        wasmFileHash = await node.registerContract(wasmPath);

        const tx = new TX()
        .target('#testacc')
        .contract(wasmFileHash)
        .method('customTypeTest')
        .args({
            from: 'from-string',
            to: 'to-string',
            units: BigInt(100),
        })
        .signer('#Signer');

        let txResult = await node.runTx(tx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`)
        }
        expect(txResult.success).toEqual(true);
        node.db.printAccountData('#testacc');
    });
    test('t2', async () => {
        const node = new TrinciNode();
        wasmFileHash = await node.registerContract(wasmPath);

        const tx = new TX()
        .target('#testacc')
        .contract(wasmFileHash)
        .method('internalTypeTest')
        .args('helloWorld')
        .signer('#Signer');

        let txResult = await node.runTx(tx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`)
        }
        expect(txResult.success).toEqual(true);
        node.db.printAccountData('#testacc');
    });
    test('t3', async () => {
        const node = new TrinciNode();
        wasmFileHash = await node.registerContract(wasmPath);

        const tx = new TX()
        .target('#testacc')
        .contract(wasmFileHash)
        .method('noTypeTest')
        .args(new Uint8Array([0xff, 0x00, 0xff]))
        .signer('#Signer');

        let txResult = await node.runTx(tx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`)
        }
        expect(txResult.success).toEqual(true);
        node.db.printAccountData('#testacc', true);
    });
    test('t4', async () => {
        const node = new TrinciNode();
        wasmFileHash = await node.registerContract(wasmPath);

        const tx = new TX()
        .target('#testacc')
        .contract(wasmFileHash)
        .method('noTypeTest2')
        .args(Buffer.from([0xff, 0x00, 0xff]))
        .signer('#Signer');

        let txResult = await node.runTx(tx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }
        expect(txResult.success).toEqual(true);
        node.db.printAccountData('#testacc', true);
    });
});
