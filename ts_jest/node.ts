import * as Errors from './errors';
import TrinciDB, { IWasmPathWithName, IWasmBinWithName } from './db';
import CTX from './ctx';
import TX from './tx';
import WasmEventEmitter from './wasmEventEmitter';
import WasmResult from './wasmResult';
import WasmMachine from './wasmMachine';
import { BridgeClient, Client, Message, Utils } from '@affidaty/t2-lib';

/**  */
export class TrinciNode {

    db: TrinciDB;

    eventEmitter: WasmEventEmitter;

    bridgeClient?: BridgeClient;

    client?: Client;

    constructor() {
        this.eventEmitter = new WasmEventEmitter();
        this.db = new TrinciDB();
    }

    /** Connecting to a socket makes so that all emitted transaction events get propagated to the connected socket. */
    async connectToSocket(address: string, port: number) {
        const tempAddress = address.startsWith('http') ? address : `http://${address}`;
        this.bridgeClient = new BridgeClient(tempAddress, 0, port);
        try {
            await this.bridgeClient.connectSocket();
        } catch (error) {
            throw error;
        }
        this.eventEmitter.on('txEvent', (args) => {
            const txEventMsg = Message.stdTrinciMessages.txEvent(
                args.eventTx,
                args.emitterAccount,
                args.emitterSmartContract,
                args.eventName,
                args.eventData,
            );
            this.bridgeClient!.writeMessage(txEventMsg);
        });
    }

    async connectToBlockchain(nodeUrl: string, network: string) {
        this.client = new Client(nodeUrl, network);
        try {
            const nodeInfo = await this.client.getNodeInfo();
        } catch (e) {
            let msg = `Error connecting to TRINCI node${typeof e !== 'undefined' ? `: ${e}` : ''}`;
            throw new Error(msg)
        }
    }

    printDB():void {
        this.db.printAssets();
    }

    /**
     * Reads smart contract file and stores it's compiled wasm module linked to it's hash. Can be accessed using getContractModule() method
     *
     * @param wasmFilePath - can be a plain string containing path to wasm file or an object \{ path: string, name?: string \} where a custom alias name can be specified.
     * @param bindAccount - specify this if newly registered smart contract needs to be immediately bound to an account.
     * @returns - newly registered smart contract hash
     */
    async registerContract(wasmFilePath: string | IWasmPathWithName, bindAccount?:string ):Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.db.registerContract(wasmFilePath, bindAccount)
            .then((refHash) => {
                return resolve(refHash);
            })
            .catch((error) => {
                return reject(error);
            })
        });
    }

    /**
     * Reads smart contract file and stores it's compiled wasm module linked to it's hash. Can be accessed using getContractModule() method
     *
     * @param wasmFilePath - can be a plain string containing path to wasm file or an object \{ path: string, name?: string \} where a custom alias name can be specified.
     * @param bindAccount - specify this if newly registered smart contract needs to be immediately bound to an account.
     * @returns - newly registered smart contract hash
     */
    async registerContractBin(wasmBin: Uint8Array | IWasmBinWithName, bindAccount?:string ):Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.db.registerContractBin(wasmBin, bindAccount)
            .then((refHash) => {
                return resolve(refHash);
            })
            .catch((error) => {
                return reject(error);
            })
        });
    }

    async runCtx(ctx:CTX, argsBytes: Uint8Array, passedRefHash: string | null = null):Promise<WasmResult> {
        return new Promise<WasmResult>((resolve,reject) => {
            let refHashToCall = passedRefHash;
            if (passedRefHash) {
                if (!this.db.contractRegistered(passedRefHash)) {
                    throw new Error(Errors.CONTRACT_NOT_REGISTERED);
                }
                this.db.bindContractToAccount(ctx.owner, passedRefHash);
            } else {
                const ownerRefHash = this.db.getAccountContractHash(ctx.owner);
                if (!ownerRefHash) {
                    throw new Error(Errors.ACCOUNT_NOT_BOUND);
                }
                refHashToCall = ownerRefHash;
            }
            const wasmModule = this.db.getContractModule(refHashToCall!);
            if (!wasmModule) {
                throw new Error(Errors.MODULE_NOT_FOUND);
            }
            const forkedDB = this.db.fork();
            const wasmMachine = new WasmMachine(wasmModule, ctx, this.db, this.eventEmitter);
            let wmRunResult = new WasmResult();
            try {
                wmRunResult = wasmMachine.run(argsBytes);
            } catch (error) {
                return reject(error);
            }
            if(wmRunResult.isError) {
                this.db = forkedDB;
            }
            return resolve(wmRunResult);
        });
    }

    async runTx(tx:TX):Promise<WasmResult> {
        return this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx.getContract());
    }

    async runBulkTxs(txs:TX[]):Promise<WasmResult[]> {
        return new Promise((resolve,reject) => {
            // fork db
            const forkedDB = this.db.fork();
            Promise.all(txs.map(async (tx:TX) => this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx.getContract()))).then(results => {
                if(results.find(wasmResult => wasmResult.isError)) {
                    this.db = forkedDB;
                    return reject(results);
                }
                return resolve(results);
            }).catch(e => {
                this.db = forkedDB;
                reject(e);
            });

            //const results:WasmResult[] = txs.map(async (tx:TX) => await this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx._contract, mockHostFunctions));
        });
    }

    getTime() {
        if (typeof this.db.time === 'undefined') {
            return Math.ceil(new Date().getTime()/1000);
        }
        return this.db.time;
    }

    setTime(time?: number) {
        this.db.time = time;
    }

    /** Clears remote accounts cache.
     * @param accountToClear - If defined, only cache relative to that account (if any) will be cleared. otherwise the whole cache will be cleared
    */
    clearRemoteAccountsCache(accountToClear?: string) {
        this.db.clearRemoteAccountsCache(accountToClear);
    }

    remoteAccountIsCached(account: string) {
        this.db.remoteAccountIsCached(account);
    }

    /** If chache for the remote account is present, that account will be restored to the state saved in cache */
    restoreAccountFromCache(accountId: string) {
        this.db.restoreAccountFromCache(accountId);
    }

    /** Clones remote account data and assets from a remote TRINCI node.  
     * Use `.connectToBlockchain()` for connection
     */
    async cloneRemoteAccount(accIdToClone: string) {
        if (!this.db.remoteAccountIsCached(accIdToClone)) {
            if (typeof this.client === 'undefined') {
                throw new Error('Not connected to a trinci node');
            }
            // here we have assets and list of keys.
            let accData = await this.client.accountData(accIdToClone, ['*']);
            // creating assets cache
            const accountAssetsCache = new Map<string, Uint8Array>();
            const assetsList = Object.keys(accData.assets);
            for (let i = 0; i < assetsList.length; i++) {
                accountAssetsCache.set(assetsList[i], accData.assets[assetsList[i]]);
            }
            const accountDataCache = new Map<string, Uint8Array>();
            // getting data for all keys
            const dataKeysList = Utils.bytesToObject(accData.requestedData[0]);
            accData = await this.client.accountData(accIdToClone, dataKeysList);
            // cloning data
            for (let i = 0; i < dataKeysList.length; i++) {
                accountDataCache.set(dataKeysList[i], accData.requestedData[i]);
            }
            this.db.updateAccountCache(accIdToClone, accountAssetsCache, accountDataCache);
        }
        this.db.restoreAccountFromCache(accIdToClone);
    }

    /** Clones remote account data and assets as well as the smart contract bound to that account (if any) from a remote TRINCI node.  
     * Use `.connectToBlockchain()` for connection
     */
    async cloneRemoteAccountWithContract(accIdToClone: string) {
        if (typeof this.client === 'undefined') {
            throw new Error('Not connected to a trinci node');
        }

        this.cloneRemoteAccount(accIdToClone);

        const accData = await this.client.accountData(accIdToClone, []);
        if (typeof accData.contractHash !== 'string' || accData.contractHash.length <= 0) {
            return;
        }
        const scHash = accData.contractHash;
        if ((scHash.length > 0) && (!this.db.contractRegistered(scHash))) {
            const contractCodeKey = `contracts:code:${scHash}`;
            const serviceAccData = await this.client.accountData(this.client.serviceAccount, [contractCodeKey]);

            if (serviceAccData.requestedData.length != 1) {
                throw new Error(`Error getting smart contract code for account ${accIdToClone}`)
            }
            const contractCode = Buffer.from(serviceAccData.requestedData[0]);
            await this.registerContractBin(contractCode)
            if(!this.db.contractRegistered(scHash)) {
                throw new Error(`Could not register smart contract ${scHash}`);
            }
        }
        this.db.bindContractToAccount(accIdToClone, scHash);
    }
}

export default TrinciNode;
