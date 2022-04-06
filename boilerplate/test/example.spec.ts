import path from 'path';
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/ts_jest';
// remember to run npm run as build to compile smart contrct
describe('Test all smart contract functionalities', () => {
    it('test method', async () => {
        // getting smart contract full path
        const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');

        // creating new TrinciNode
        const node = new TrinciNode();

        // registering smart contract inside node and getting it's reference hash
        const scRefHash = await node.registerContract(wasmFilePath);

        // creating new mocked transaction
        const tx = new TX()
        .target('#TargetAccount')
        .contract(scRefHash) // in this moment #TargetAccount doesn't exist, you must specify the hash to create account and bind it with specific smart contract
        .method('test_method')
        .signer('MyDeployAccount'); // in this environement you can use any AccountId as string, in production you must use a private key and Node derives accountId from them

        // running smart contract by passing it our mocked transaction
        let txResult = await node.runTx(tx);

        // checking execution result
        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`)
        }
        expect(txResult.resultDecoded).toEqual(true);
        node.db.printData("#TargetAccount");
        
    });
    it('init method', async () => {
        // getting smart contract full path
        const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');

        // creating new TrinciNode
        const node = new TrinciNode();

        // registering smart contract inside node and getting its reference hash
        const scRefHash = await node.registerContract(wasmFilePath);

        // creating new mocked transaction
        const tx = new TX()
        .target('#TargetAccount')
        .contract(scRefHash) // in this moment #TargetAccount doesn't exist, you must specify the hash to create account and bind it with specific smart contract
        .method('init')
        .args({owner : "MyOwner", max_mintable: 100000000,total_minted : 0}) // config object compatible as defined in smart contract as class Config {....}
        .signer('MyDeployAccount'); // in this environment you can use any AccountId as string, in production you must use a private key and Node derives accountId from them

        // running smart contract by passing it our mocked transaction
        let txResult = await node.runTx(tx);

        // checking execution result
        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }
        expect(txResult.resultDecoded).toEqual(true); // check blockchain response
        expect(node.db.getDataFromOwnerDB("#TargetAccount","init") == true); // check if data was stored in DB
        node.db.printData("#TargetAccount");  // use this tool to print in console the table of KVStore about any account such as TargetAccount
    });
    it('mint method', async () => {
        // getting smart contract full path
        const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');

        // creating new TrinciNode
        const node = new TrinciNode();

        // registering smart contract inside node and getting its reference hash
        const scRefHash = await node.registerContract(wasmFilePath);

        // creating new mocked transaction
        const tx = new TX()
        .target('#TargetAccount')
        .contract(scRefHash) // in this moment #TargetAccount doesn't exist, you must specify the hash to create account and bind it with specific smart contract
        .method('init')
        .args({owner : "MyOwner", max_mintable: 100000000,total_minted : 0}) // config object compatible as defined in smart contract as class Config {....}
        .signer('MyDeployAccount'); // in this environment you can use any AccountId as string, in production you must use a private key and Node derives accountId from them

        // running smart contract by passing it our mocked transaction
        await node.runTx(tx); // we don't take care about result
        const mintedToken = 1000;
        const mintTx = new TX()
        .target('#TargetAccount')
        //.contract(scRefHash) you can ignore contract in this scenareo, because the first TX bind forever #TargetAccount with smart contract release.wasm
        .method('mint')
        .args({
            to:"AnotherAccount",
            units:mintedToken
        }) // TransferArgs object compatible as defined in smart contract as class TransferArgs {....}
        .signer('MyOwner'); // the Mint rule allow only MyOwner account to mint, as defined in previous tx {owner: "MyOwner" ....}
        const txResult = await node.runTx(mintTx);
        // checking execution result
        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }
        expect(txResult.resultDecoded).toEqual(mintedToken); // check blockchain response, mint return the balance of minted account 
        expect(node.db.balance("#TargetAccount","AnotherAccount") == mintedToken); // check if balance of AnotherAccount is equal to minted tokens
        node.db.printAssets();  // use this tool to print in console the table of KVStore about any account such as TargetAccount
    });
    it('transfer method', async () => {
        // getting smart contract full path
        const wasmFilePath = path.resolve(__dirname, '../build/release.wasm');

        // creating new TrinciNode
        const node = new TrinciNode();

        // registering smart contract inside node and getting its reference hash
        const scRefHash = await node.registerContract(wasmFilePath);

        // creating new mocked transactions
        await node.runTx(new TX().target('#TargetAccount').contract(scRefHash).method('init').args({owner : "MyOwner", max_mintable: 100000000,total_minted : 0}).signer('MyDeployAccount')); // init
        await node.runTx(new TX().target('#TargetAccount').method('mint').args({to:"AnotherAccount",units:1000}).signer('MyOwner')); //  mint
        
        const transferTx = new TX()
        .target('#TargetAccount') // specify token account
        //.contract(scRefHash) you can ignore contract in this scenareo, because the first TX bind forever #TargetAccount with smart contract release.wasm
        .method('transfer')
        .args({
            to:"DestAccount",
            units:100 // transfer 100 tokens
        }) // TransferArgs object compatible as defined in smart contract as class TransferArgs {....}
        .signer('AnotherAccount'); // the Transfer rule allow only Account's Owner to move token from his account, so the signature must be created by AnotherAccount
        const txResult = await node.runTx(transferTx);
        // checking execution result
        if (txResult.isError) {
            console.log(`Error: ${txResult.errorMessage}`);
        }
        expect(txResult.resultDecoded).toEqual((1000 - 100)); // check blockchain response, transfer return the balance of owner account 
        expect(node.db.balance("#TargetAccount","AnotherAccount") == (1000 - 100)); // check if balance of AnotherAccount is equal to minted tokens - transfer tokens
        expect(node.db.balance("#TargetAccount","DestAccount") ==  100); // check if balance of AnotherAccount is equal to minted tokens - transfer tokens
        node.db.printAssets();  // use this tool to print in console the table of KVStore about any account such as TargetAccount
    });
});
