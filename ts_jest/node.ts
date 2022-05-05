import * as Errors from './errors';
import TrinciDB, { IWasmPathWithName } from './db';
import CTX from './ctx';
import TX from './tx';
import WasmMachine, { WasmResult } from './wasmMachine';
export class TrinciNode {

    db: TrinciDB;

    constructor() {
        this.db = new TrinciDB();
    }
    printDB():void {
        this.db.printAssets();
    }
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

    async runCtx(ctx:CTX, argsBytes: Uint8Array, passedRefHash: string | null = null, hostFunctionsMock = {}):Promise<WasmResult> {
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
            const wasmMachine = new WasmMachine(wasmModule, ctx, this.db, hostFunctionsMock);
            let wmRunResult = new WasmResult();
            try {
                wmRunResult = wasmMachine.run(argsBytes);
            } catch (error) {
                return reject(error);
            }
            if(wmRunResult.isError) {
                //console.log(this.db,forkedDB);
                this.db = forkedDB;
            }
            return resolve(wmRunResult);
        });
    }

    async runTx(tx:TX, mockHostFunctions = {}):Promise<WasmResult> {
        return this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx._contract, mockHostFunctions);
        /*
        return new Promise((resolve,reject) => {
            this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx._contract, mockHostFunctions).then(wasmResult => {
                if(wasmResult.isError) {
                    reject(wasmResult);
                } else {
                    resolve(wasmResult);
                }
            }).catch(reject);
        });*/
    }
    async runBulkTxs(txs:TX[], mockHostFunctions = {}):Promise<WasmResult[]> {
        return new Promise((resolve,reject) => {
            // fork db
            const forkedDB = this.db.fork();
            Promise.all(txs.map(async (tx:TX) => this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx._contract, mockHostFunctions))).then(results => {
                if(results.find(wasmResult => wasmResult.isError)) {
                    this.db = forkedDB;
                    return reject(results);    
                }
                resolve(results);
            }).catch(e => {
                this.db = forkedDB;
                reject(e);
            });

            //const results:WasmResult[] = txs.map(async (tx:TX) => await this.runCtx(tx.toCTX(),tx.getArgsBytes(), tx._contract, mockHostFunctions));
            
        });
    }
}

export default TrinciNode;
