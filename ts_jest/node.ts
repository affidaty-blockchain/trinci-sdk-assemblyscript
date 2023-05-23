import * as Errors from './errors';
import TrinciDB, { IWasmPathWithName } from './db';
import CTX from './ctx';
import TX from './tx';
import WasmEventEmitter from './wasmEventEmitter';
import WasmResult from './wasmResult';
import WasmMachine from './wasmMachine';
import { BridgeClient, Message } from '@affidaty/t2-lib';

/**  */
export class TrinciNode {

    db: TrinciDB;

    eventEmitter: WasmEventEmitter;

    client?: BridgeClient;

    constructor() {
        this.eventEmitter = new WasmEventEmitter();
        this.db = new TrinciDB();
    }

    /** Connecting to a socket makes so that all emitted transaction events get propagated to the connected socket. */
    async connectToSocket(address: string, port: number) {
        const tempAddress = address.startsWith('http') ? address : `http://${address}`;
        this.client = new BridgeClient(tempAddress, 0, port);
        try {
            await this.client.connectSocket();
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
            this.client!.writeMessage(txEventMsg);
        });
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
}

export default TrinciNode;
