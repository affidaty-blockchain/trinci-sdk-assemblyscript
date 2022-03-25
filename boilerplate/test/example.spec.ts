import path from 'path';
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/jestenv';

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
        .network('net_str')
        .target('target_acc')
        .contract(scRefHash)
        .args('a b c d e')
        .method('test_method')
        .signer('signer_acc');

        // running smart contract by passing it our mocked transaction
        let runResult = await n.runTx(tx);

        // checking execution result
        if (runResult.isError) {
            console.log(`Error: ${runResult.errorMessage}`)
        }
        expect(Buffer.from(runResult.result).toString()).toEqual('Test method OK');
    });
});
