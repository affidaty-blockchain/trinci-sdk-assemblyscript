import path from 'path';
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/ts_jest';

describe('desc1', () => {
    it('it1', async () => {
        // getting smart contract full path
        const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');

        // creating new TrinciNode
        const n = new TrinciNode();

        // registering smart contract inside node and getting it's reference hash
        const scRefHash = await n.registerContract(wasmFilePath);

        // creating new mocked transaction
        const tx = new TX()
        .setNetwork('net_str')
        .setTarget('target_acc')
        .setContract(scRefHash)
        .setArgs('a b c d e')
        .setMethod('test_method')
        .setSigner('signer_acc');

        // running smart contract by passing it our mocked transaction
        let runResult = await n.runTx(tx);

        // checking execution result
        if (runResult.isError) {
            console.log(`Error: ${runResult.errorMessage}`)
        }
        expect(Buffer.from(runResult.result).toString()).toEqual('Test method OK');
    });
});
