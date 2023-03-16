[<BACK](index)
## Build

To compile your smart contract as a WASM file you can either run an npm script
```
npm run asbuild
```
or, if you decided to create your project from scratch
```
asc assembly/index.ts --config asconfig.json --target release --use abort=
```

In case you didn't utilize boilerplate code from the package but still want to use `@msgpackable` decorator, you will need to copy file `msgpackable.mjs` from `boilerplate` directory to your project root directory and add a parameter to your compilation command
```
asc assembly/index.ts --config asconfig.json --target release --transform ./msgpackable.mjs --use abort=
```

After compilation newly generated WASM files will be placed into `build` directory of your project. Default compilation output path can be changed in `asconfig.json` in your project root directory.

&nbsp;

## Tests(JEST)

Preliminary testing of the newly compiled code can be done directly whithin the project itself using Jest with either a direct commend or with an npm script (`package.json` from `boilerplate` directory)
```
npm run test
```

This will launch all `*.spec.ts` and `*.test.ts` files inside `test` directory in the root of the project.

Bare minimum test example:

```ts
import { TrinciNode, TX } from '@affidaty/trinci-sdk-as/ts_jest';

describe('test transaction', () => {
    it('is successful', async () => {
        // creating new TrinciNode
        const node = new TrinciNode();

        const wasmFilePath = '/path/to/my-smart-contract.wasm';
        // registering smart contract inside node and getting its reference hash
        const contractHash = await node.registerContract(wasmFilePath);
        // multiple smart contracts can be registered

        // creating new mocked transaction
        const tx = new TX()
        .target('OwnerAccountId')
        .contract(contractHash)
        .method('tested_method')
        .args({string:"a string", number: 42})
        .signer('SignerAccountId');

        // running transaction
        let txResult = await node.runTx(tx);
        // multiple transactions can be executed one after another

        // logging execution result
        if (txResult.success) {
            console.log(`Success! Result hex: [${Buffer.from(txResult.result).toString('hex')}]`);
        } else {
            console.log(`Error! Message: [${txResult.errorMessage}]`);
        }

        // expecting transaction to be successful
        expect(txResult.success).toBeTruthy();
    });
});

```

In the specific case of the transaction defined in the test above the [CTX](./basic.md#ctx) will be initialized as follows:
```json
[
   0,                 // depth
   "",                // network, default value for test env
   "OwnerAccountId",  // owner
   "SignerAccountId", // caller (equal to origin if depth is 0)
   "tested_method",   // method
   "SignerAccountId"  // origin
]
```


&nbsp;


### Events capturing

Events emitted using [`emit()` host function](./host_functions.md#emiteventname-string-eventdata-u8-void) can be captured during test in two ways:

- Registering event listener for `txEvent` event:

    ```ts
    node.eventEmitter.on('txEvent', (args) => {
            // converting binary data to a "0x..." string for logging
            const tempArgs = {...args, eventData: `0x${Buffer.from(args.eventData).toString('hex')}`};
            console.log(`Caught a transaction event:\n${JSON.stringify(tempArgs, null, 2)}\n`);
    });
    ```

    If you need to process events inside the test itself.

    Example of event `args`:

    ```ts
    {
        eventTx: '1220ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        emitterAccount: 'OwnerAccountId',
        emitterSmartContract: '1220e7a5e46669886623053fb638f384d821fc4e053151d8717f83e252c9f55de139',
        eventName: 'test_event',
        eventData: [ // Uint8Array
            130, 166, 115, 116, 114, 105,
            110, 103, 168,  97,  32, 115,
            116, 114, 105, 110, 103, 166,
            110, 117, 109,  98, 101, 114,
            42
        ]
    }
    ```
- Connecting to a socket relay.  

    `TrinciNode` class can connect to TCP socket and send transaction event messagges on event emission in the same way an ordinary TRINCI node would. This makes it possible to test your smart contract in conjunction with the rest of your backend architecture.  
    If your project has been initialized using boilerplate code from sdk package, then a very basic socket relay can be found at `<projectRoot>/utils/socketRelay.js`.  
    Launching it will create a server listening for connections on `localhost:8001` (by default).  
    It will receive messages from a connected client and relay them to all other clients.  
    Launching `./utils/socketRelay.js --help` will print help on launch arguments.  
    In order to connect to relay from inside a test add following code before executing transaction that should produce an event: 
    ```ts
    await node.connectToSocket('localhost', 8001);
    ```

    P.S. On test execution socket relay must be already up and all receiving clients must be connected (for example using [T2Lib](https://www.npmjs.com/package/@affidaty/t2-lib)).