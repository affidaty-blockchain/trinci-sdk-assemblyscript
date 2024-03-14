import path from 'path';
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/ts_jest';

const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');
let scRefHash = '';
let node: TrinciNode;

const accounts = {
    instance: '#InstanceAccount',
    admin: '#AdminAccount',
    user1: '#User1Account',
    user2: '#User2Account',
}

async function init(node?: TrinciNode): Promise<TrinciNode> {
    const _node = node || new TrinciNode();
    scRefHash = await _node.registerContract(wasmFilePath);
    const tx = new TX()
        .target(accounts.instance)
        .contract(scRefHash)
        .method('init')
        .args({})
        .signer(accounts.admin);
    let txResult = await _node.runTx(tx);
    if (txResult.isError) {
        throw new Error(`init error: ${txResult.errorMessage}`);
    }
    return _node;
}

async function mint(node: TrinciNode, to: string, units: number): Promise<TrinciNode> {
    const mintTx = new TX()
        .target(accounts.instance)
        .method('mint')
        .args({
            to,
            units,
        })
        .signer(accounts.admin);
    const txResult = await node.runTx(mintTx);
    if (txResult.isError) {
        throw new Error(`mint error: ${txResult.errorMessage}`);
    }
    return node;
}

describe('Test all smart contract functionalities', () => {

    it('init method', async () => {
        const node = await init();
        expect(node.db.getAccountDataPacked(accounts.instance,'init')).toBeTruthy();
        expect(node.db.getAccountDataPacked(accounts.instance, 'config')).toEqual({
            admin: accounts.admin,
            max_mintable: 18446744073709551615n,
            total_minted: 0
        });
        // node.db.printAccountData('#TargetAccount');
    });

    it('get_config method', async () => {
        const node = await init();

        const tx = new TX()
        .target(accounts.instance)
        .contract(scRefHash)
        .method('get_config')
        .signer(accounts.admin);

        let txResult = await node.runTx(tx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }
        expect(txResult.success).toBeTruthy();
        expect(txResult.resultDecoded).toEqual({
            admin: accounts.admin,
            total_minted: 0,
            max_mintable: 18446744073709551615n
        });
    });

    it('mint method', async () => {
        let node = await init();
        const mintedAmount = 100;
        node = await mint(node, accounts.user1, mintedAmount);
        expect(node.db.getAccountAssetPacked(accounts.user1, accounts.instance)).toEqual(mintedAmount);
        expect(node.db.getAccountDataPacked(accounts.instance, 'config').total_minted).toEqual(mintedAmount);
        // node.db.printAssets();
        // node.db.printAccountData('#TargetAccount');
    });
    it('transfer method', async () => {
        const mintedAmount = 100;
        const transferedAmount = 10;

        let node = await init();
        node = await mint(node, accounts.user1, mintedAmount);

        const transferTx = new TX()
        .target(accounts.instance)
        .method('transfer')
        .args({
            from: accounts.user1,
            to: accounts.user2,
            units: transferedAmount,
        })
        .signer(accounts.user1);

        const txResult = await node.runTx(transferTx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }

        expect(txResult.success).toBeTruthy();
        expect(node.db.getAccountAssetPacked(accounts.user1, accounts.instance)).toEqual(mintedAmount - transferedAmount);
        expect(node.db.getAccountAssetPacked(accounts.user2, accounts.instance)).toEqual(transferedAmount);
        // node.db.printAssets();
    });
    it('emit', async () => {
        const eventData = new Uint8Array([0xff, 0x00, 0xff, 0xcc]);

        let node = await init();

        // Uncomment next line to connect to a socket and relay emitted events there
        // await node.connectToSocket('localhost', 8001);

        const emitTx = new TX()
        .target(accounts.instance)
        .method('emit')
        .argsBytes(eventData)
        .signer(accounts.user1);

        node.eventEmitter.on('txEvent', (event) => {
            console.log(`Event "${event.eventName}" from "${event.emitterAccount}"; data: 0x${Buffer.from(event.eventData).toString('hex')}`)
        })

        const txResult = await node.runTx(emitTx);

        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }

        // uncomment next line if a socket connection has been established previously, otherwise test will hung up until stopped manually
        // await node.closeSocket();

        expect(txResult.success).toBeTruthy();
        // node.db.printAssets();
    });
});
