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
            const wasmMachine = new WasmMachine(wasmModule, ctx, this.db, hostFunctionsMock);
            let wmRunResult = new WasmResult()
            try {
                wmRunResult = wasmMachine.run(argsBytes);
            } catch (error) {
                return reject(error);
            }
            return resolve(wmRunResult);
        });
    }

    async runTx(tx:TX, mockHostFunctions = {}):Promise<WasmResult> {
        return this.runCtx(tx.toCTX(),tx.argsBytes, tx.contract, mockHostFunctions);
    }
}

export default TrinciNode;
