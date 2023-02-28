
import fastSha256 from 'fast-sha256';
import * as Errors from './errors';
import * as Defaults from './defaults';
import * as Utils from './utils';
import WasmResult from './wasmResult';
import trinciDB  from './db';
import CTX from './ctx';
import WasmEventEmitter from './wasmEventEmitter';
import { ITxEvent } from '@affidaty/t2-lib';

// interface IHostFunctionMock {
//     hf_log?(string): string;
//     hf_load_data?()
// }

export class WasmMachine {
    wasmModule: WebAssembly.Module;
    wasmMem: WebAssembly.Memory;
    imports: WebAssembly.Imports;
    wasmInstance: WebAssembly.Instance | null = null;
    currentCtx: CTX;
    db:trinciDB;
    eventEmitter: WasmEventEmitter;
    possibleMallocNames: string[];
    currMallocName: string | null;
    constructor(
        wasmModule: WebAssembly.Module,
        ctx: CTX = new CTX(),
        trinciDb:trinciDB,
        eventEmitter?: WasmEventEmitter,
    ) {
        this.possibleMallocNames = ['alloc', 'malloc'];
        this.currMallocName = null;
        this.eventEmitter = eventEmitter || new WasmEventEmitter();
        this.currentCtx = ctx;
        this.wasmModule = wasmModule;
        this.wasmMem = new WebAssembly.Memory(Defaults.defaultWasmMemParams);
        this.db = trinciDb;
        this.imports = {
            index: {},
            env: {
                memory: this.wasmMem,
                abort(msg: any, file: any, line: any, column: any) {
                    console.log('called abort()');
                },
                trace(msg: any, n: any) {
                    console.log('called trace()');
                },
            },
            hostfunctions: {
                hf_log: (offset: number, length: number) => {
                    console.log(`WASM_LOG(${offset}+${length}): ${Buffer.from(this.readFromWasmMem(offset, length)).toString()}`);
                },
                hf_emit: (
                    eventNameAddress: number,
                    eventNameLength: number,
                    eventDataAddress: number,
                    eventDataLength: number
                ) => {
                    const txEvent: ITxEvent = {
                        eventTx: '1220ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                        emitterAccount: this.currentCtx.owner,
                        emitterSmartContract: this.db.getAccountContractHash(this.currentCtx.owner)!,
                        eventName: Buffer.from(this.readFromWasmMem(eventNameAddress, eventNameLength)).toString(),
                        eventData: this.readFromWasmMem(eventDataAddress, eventDataLength),
                    };
                    this.eventEmitter.emit('txEvent', txEvent);
                },
                hf_load_data: (keyOffset: number, keyLength: number): bigint => {
                    const key = Buffer.from(this.readFromWasmMem(keyOffset, keyLength)).toString();
                    const accountData = this.db.getAccountData(this.currentCtx.owner, key);
                    if(!accountData) {
                        return Utils.combinePointer(this.writeToWasmMem(new Uint8Array([])), 0);
                    }
                    return Utils.combinePointer(this.writeToWasmMem(accountData), accountData.byteLength);
                },
                hf_store_data: (keyOffset: number, keyLength: number, dataOffset: number, dataLength: number): void => {
                    const key = Buffer.from(this.readFromWasmMem(keyOffset, keyLength)).toString();
                    const data = this.readFromWasmMem(dataOffset, dataLength);
                    this.db.setAccountData(this.currentCtx.owner,key,data);
                    return;
                },
                hf_remove_data: (keyOffset: number, keyLength: number): void => {
                    const key = Buffer.from(this.readFromWasmMem(keyOffset, keyLength)).toString();
                    this.db.removeAccountData(this.currentCtx.owner,key);
                    return;
                },
                hf_get_keys: (patternOffset: number, patternLength: number): bigint => {
                    const pattern = Buffer.from(this.readFromWasmMem(patternOffset, patternLength)).toString();
                    const keysList: string[] = this.db.getAccountDataKeys(this.currentCtx.owner, pattern);
                    const encodedKeysList = new Uint8Array(Utils.mpEncode(keysList));
                    const encodedAppOutput = Utils.encodeAppOutput(true, encodedKeysList);
                    return Utils.combinePointer(this.writeToWasmMem(encodedAppOutput), encodedAppOutput.byteLength);
                },
                hf_load_asset: (accountOffset: number, accountLength: number): bigint => {
                    const account = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const accountAssetData = this.db.getAccountAsset(account, this.currentCtx.owner);
                    if(!accountAssetData) {
                        return Utils.combinePointer(this.writeToWasmMem(new Uint8Array([])), 0);
                    }
                    return Utils.combinePointer(this.writeToWasmMem(accountAssetData), accountAssetData.byteLength);
                },
                hf_store_asset: (accountOffset: number, accountLength: number, dataOffset: number, dataLength: number): void => {
                    const account = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const data = this.readFromWasmMem(dataOffset, dataLength)
                    this.db.setAccountAsset(account, this.currentCtx.owner,data);
                    return;
                },
                hf_remove_asset: (accountOffset: number, accountLength: number): void => {
                    const account = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    this.db.removeAccountAsset(account, this.currentCtx.owner);
                    return;
                },
                hf_get_account_contract: (accountOffset: number, accountLength: number): bigint => {
                    const account = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const refHash = this.db.getAccountContractHash(account);
                    if(!refHash) {
                        return Utils.combinePointer(this.writeToWasmMem(new Uint8Array([])), 0);
                    }
                    const refHashBytes = new Uint8Array(Buffer.from(refHash, 'hex'));
                    return Utils.combinePointer(this.writeToWasmMem(refHashBytes), refHashBytes.byteLength);
                },
                hf_sha256: (dataOffset: number, dataLength: number): bigint => {
                    const data = this.readFromWasmMem(dataOffset, dataLength);
                    const sha256 = fastSha256(data);
                    return Utils.combinePointer(this.writeToWasmMem(sha256), sha256.byteLength);
                },
                hf_is_callable : ( accountOffset: number,accountLength: number,methodOffset: number,methodLength: number): number => {
                    const calledAccount = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const calledMethod = Buffer.from(this.readFromWasmMem(methodOffset, methodLength)).toString();
                    let contractHaseInCalledAccount = this.db.getAccountContractHash(calledAccount);
                    if(contractHaseInCalledAccount) {
                        const moduleToCall = this.db.getAccountContractModule(calledAccount)!;
                        const newWasmMachine = new WasmMachine(moduleToCall, this.currentCtx.derive(calledAccount, calledMethod), this.db, this.eventEmitter);
                        if(newWasmMachine.isCallable(calledMethod)) {
                            return 1;
                        }
                        return 0;
                    }
                    return 0;
                },
                hf_s_call : (
                    accountOffset: number,
                    accountLength: number,
                    hashOffset: number,
                    hashLength : number,
                    methodOffset: number,
                    methodLength: number,
                    dataOffset: number,
                    dataLength: number
                ) : bigint => {
                    const calledAccount = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const calledMethod = Buffer.from(this.readFromWasmMem(methodOffset, methodLength)).toString();
                    const args = this.readFromWasmMem(dataOffset, dataLength);
                    const hashContract = Buffer.from(this.readFromWasmMem(hashOffset, hashLength)).toString('hex');
                    // lookiing for hash of callerAccount
                    let calledAccountContract = this.db.getAccountContractHash(calledAccount);
                    if (!calledAccountContract) {
                        this.db.bindContractToAccount(calledAccount, hashContract);
                        calledAccountContract = hashContract;
                    } else if (calledAccountContract === hashContract) {
                        // all ok
                    } else {
                        // cannot bind an already bound account
                        const result = new WasmResult().setError(Errors.ACCOUNT_ALREADY_BOUND).toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                    }

                    if (calledAccountContract) {
                        // same logic as call
                        const moduleToCall = this.db.getAccountContractModule(calledAccount);
                        if (!moduleToCall) {
                            const result = new WasmResult().setError(Errors.ACCOUNT_NOT_BOUND).toBytes();
                            return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                        }

                        const newWasmMachine = new WasmMachine(moduleToCall, this.currentCtx.derive(calledAccount, calledMethod), this.db);
                        const runResult = newWasmMachine.run(args);
                        const runResultBytes = runResult.toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(runResultBytes), runResultBytes.byteLength);

                    }
                    const result = new WasmResult().setError(Errors.ACCOUNT_NOT_BOUND).toBytes();
                    return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);

                },
                hf_call: (
                    accountOffset: number,
                    accountLength: number,
                    methodOffset: number,
                    methodLength: number,
                    dataOffset: number,
                    dataLength: number,
                ): bigint => {
                    const calledAccount = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const calledMethod = Buffer.from(this.readFromWasmMem(methodOffset, methodLength)).toString();
                    const args = this.readFromWasmMem(dataOffset, dataLength);
                    const moduleToCall = this.db.getAccountContractModule(calledAccount);
                    
                    if (!moduleToCall) {
                        const result = new WasmResult().setError(Errors.ACCOUNT_NOT_BOUND).toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                    }
                    const newWasmMachine = new WasmMachine(moduleToCall, this.currentCtx.derive(calledAccount, calledMethod), this.db, this.eventEmitter);
                    try {
                        const runResult = newWasmMachine.run(args);
                        const runResultBytes = runResult.toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(runResultBytes), runResultBytes.byteLength);
                    } catch(e) {
                        const result = new WasmResult().setError(Errors.METHOD_NOT_FOUND).toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                    }
                },
                hf_verify: (
                    pubKeyAddress: number,
                    pubKeyLength: number,
                    dataAddress: number,
                    dataLength: number,
                    signatureAddress: number,
                    signatureLength: number,
                ): number => {
                    console.log('Wasm called hf_verify(). Returning true by default.');
                    return 1;
                },
                hf_drand: (
                    max: BigInt
                ): BigInt => {
                    const maxN: number = (Number(max) + 1) * Math.random();
                    return BigInt(Math.floor(maxN));
                },
                hf_get_block_time: (): bigint => {
                    return BigInt(Math.ceil(new Date().getTime()/1000))
                }
            },
        };
        Object.assign(this.imports.env,this.imports.hostfunctions);
        return;
    }

    instantiate():void {
        this.wasmInstance = new WebAssembly.Instance(this.wasmModule, this.imports);
        this.wasmMem = this.wasmInstance.exports.memory as WebAssembly.Memory;
        this.currMallocName = null;
        return;
    }

    reset(): void {
        this.wasmInstance = null;
        this.currMallocName = null;
        return;
    }

    readFromWasmMem(offset: number, length: number): Uint8Array {
        if (!this.wasmInstance) {
            throw new Error(Errors.WM_NOT_INST);
        }
        return new Uint8Array(Buffer.from(this.wasmMem.buffer, offset, length));
    }

    writeToWasmMem(data: Uint8Array): number {
        if (!this.wasmInstance) {
            throw new Error(Errors.WM_NOT_INST);
        }
        if (data.byteLength <= 0) {
            return 0;
        }
        const offset: number = (this.wasmInstance.exports[this.getCurrMallocName()] as CallableFunction)(data.byteLength);
        const wasmMemView = new Uint8Array(this.wasmMem.buffer);
        wasmMemView.set(data, offset);
        return offset;
    }

    public getCurrMallocName(forceRescan: boolean = false): string {
        if (!this.wasmInstance) {
            this.currMallocName = null;
            throw new Error(Errors.WM_NOT_INST);
        }
        if (this.currMallocName && this.currMallocName.length && !forceRescan) {
            return this.currMallocName;
        }
        const wasmInstanceExports = Object.keys(this.wasmInstance.exports);
        for (const mallocName of this.possibleMallocNames) {
            if (wasmInstanceExports.includes(mallocName)) {
                this.currMallocName = mallocName;
                return this.currMallocName;
            }
        }
        throw new Error(Errors.ALLOC_NOT_FOUND);
    }

    private decodeResult(runResult: bigint): WasmResult {
        const coords = Utils.splitPointer(runResult);
        const runResultBytes = this.readFromWasmMem(coords.offset, coords.length);
        return new WasmResult().fromBytes(runResultBytes);
    }

    callExportedMethod(methodToRun: string, ...args: number[]): bigint {
        if (!this.wasmInstance) {
            throw new Error(Errors.WM_NOT_INST);
        }
        const runResult = (this.wasmInstance!.exports[methodToRun] as CallableFunction)(...args);
        return runResult;
    }

    isCallable(method:string):boolean {
        this.instantiate();
        try {
            const method_bytes = new Uint8Array(Utils.mpEncode(method));
            const method_bytes_offset = this.writeToWasmMem(method_bytes);
            if (typeof this.wasmInstance!.exports.is_callable === 'undefined') {
                return false;
            }
            return (this.wasmInstance!.exports.is_callable as CallableFunction)(method_bytes_offset,method_bytes.byteLength);
        } catch(e) {
            console.error(e);
            return false;
        }
    }

    run(argsBytes: Uint8Array = new Uint8Array([])): WasmResult {
        this.instantiate();
        const ctxBytes = this.currentCtx.toBytes();
        const ctxOffset = this.writeToWasmMem(ctxBytes);
        const argsOffset = this.writeToWasmMem(argsBytes);
        const runResult =  this.callExportedMethod('run', ctxOffset, ctxBytes.byteLength, argsOffset, argsBytes.byteLength);
        return (this.decodeResult(runResult));
    }

}

export default WasmMachine;
