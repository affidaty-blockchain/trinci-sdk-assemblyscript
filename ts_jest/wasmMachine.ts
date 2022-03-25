
import fastSha256 from 'fast-sha256';
import * as Errors from './errors';
import * as Defaults from './defaults';
import * as Utils from './utils';
import trinciDB  from './db';
import CTX from './ctx';

export class WasmResult {
    success: boolean;
    result: Uint8Array;

    constructor(success?: boolean, result?: Uint8Array) {
        this.success = success ? success : false;
        this.result = result ? result : new Uint8Array([]);
    }

    fromBytes(bytes: Uint8Array): WasmResult {
        const decodedBytes = Utils.mpDecode(bytes) as [boolean, Buffer];
        this.success = decodedBytes[0];
        this.result = decodedBytes[1];
        return this;
    }

    toBytes(): Uint8Array {
        const encodedBytes = Utils.mpEncode([
            this.success,
            Buffer.from(this.result),
        ]);
        return new Uint8Array(encodedBytes);
    }

    setError(message: string): WasmResult {
        this.success = false;
        this.result = new Uint8Array(Buffer.from(message));
        return this;
    }

    setSuccess(data: Uint8Array): WasmResult {
        this.success = true;
        this.result = data;
        return this;
    }

    setTrue(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc3]);
        return this;
    }

    setFalse(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc2]);
        return this;
    }

    setNull(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc0]);
        return this;
    }

    get isError(): boolean {
        return !this.success;
    }

    decode():any {
        return {
            success : this.success,
            result: this.success ? Utils.mpDecode(this.result) : this.errorMessage
        }
    }

    get errorMessage(): string {
        return Buffer.from(this.result).toString();
    }

    get resultDecoded(): any {
        return Utils.mpDecode(this.result);
    }
}

export class WasmMachine {
    wasmModule: WebAssembly.Module;
    wasmMem: WebAssembly.Memory;
    imports: WebAssembly.Imports;
    wasmInstance: WebAssembly.Instance | null = null;
    currentCtx: CTX;
    db:trinciDB;
    constructor(
        wasmModule: WebAssembly.Module,
        ctx: CTX = new CTX(),
        trinciDb:trinciDB,
        mockHostFunctions:any = {}
    ) {
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
                    const eventName = Buffer.from(this.readFromWasmMem(eventNameAddress, eventNameLength)).toString();
                    const eventData = this.readFromWasmMem(eventDataAddress, eventDataLength);
                    console.log(`${eventName}: ${Buffer.from(eventData).toString('hex')}`);
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
                        const newWasmMachine = new WasmMachine(moduleToCall, this.currentCtx.derive(calledAccount, calledMethod), this.db);
                        if(newWasmMachine.isCallable(calledMethod)) {
                            return 1;
                        }
                        return 0;
                    }
                    return 0;
                },
                hf_scall : (
                    accountOffset: number,
                    accountLength: number,
                    methodOffset: number,
                    methodLength: number,
                    hashOffset: number,
                    hashLength : number,
                    dataOffset: number,
                    dataLength: number
                ) : bigint => {
                    
                    const calledAccount = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const calledMethod = Buffer.from(this.readFromWasmMem(methodOffset, methodLength)).toString();
                    const args = this.readFromWasmMem(dataOffset, dataLength);
                    const hashContract = Buffer.from(this.readFromWasmMem(hashOffset, hashLength)).toString();
                    // lookiing for hash of callerAccount
                    let contractHaseInCalledAccount = this.db.getAccountContractHash(calledAccount);
                    if(contractHaseInCalledAccount == null || contractHaseInCalledAccount == hashContract) {
                        this.db.accountBindings.set(calledAccount, hashContract);
                        contractHaseInCalledAccount = hashContract;
                    } else {
                        // impossible to bind an account already tampered
                        const result = new WasmResult().setError(Errors.ACCOUNT_ALREADY_BINDED).toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                    }
                    if(contractHaseInCalledAccount) { // if exists, chack if hash === hashContract
                            //TODO: return ptrcombinde with specific error
                       
                            // tamper account with hashContract
                            this.db.bindContractToAccount(calledAccount,hashContract);
                            // same CALL logic
                            const moduleToCall = this.db.getAccountContractModule(calledAccount);
                            console.log("Enter in scall");
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
                    // if(typeof mockHostFunctions.hf_call == "function") {
                    //     const mockResult:WasmResult = mockHostFunctions.hf_call(calledAccount,calledMethod,args);
                    //     const mockResultBytes = mockResult.toBytes();
                    //     return Utils.combinePointer(this.writeToWasmMem(mockResultBytes), mockResultBytes.byteLength);
                    // }
                    const calledAccount = Buffer.from(this.readFromWasmMem(accountOffset, accountLength)).toString();
                    const calledMethod = Buffer.from(this.readFromWasmMem(methodOffset, methodLength)).toString();
                    const args = this.readFromWasmMem(dataOffset, dataLength);
                    const moduleToCall = this.db.getAccountContractModule(calledAccount);
                    
                    if (!moduleToCall) {
                        const result = new WasmResult().setError(Errors.ACCOUNT_NOT_BOUND).toBytes();
                        return Utils.combinePointer(this.writeToWasmMem(result), result.byteLength);
                    }
                    const newWasmMachine = new WasmMachine(moduleToCall, this.currentCtx.derive(calledAccount, calledMethod), this.db);
                    
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
                    console.log('called hf_verify() function. returning true;');
                    return 1;
                },
            },
        };
        Object.assign(this.imports.env,this.imports.hostfunctions);
        return;
    }

    instantiate():void {
        this.wasmInstance = new WebAssembly.Instance(this.wasmModule, this.imports);
        this.wasmMem = this.wasmInstance.exports.memory as WebAssembly.Memory;
        return;
    }

    reset(): void {
        this.wasmInstance = null;
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
        const offset: number = (this.wasmInstance.exports.alloc as CallableFunction)(data.byteLength);
        const wasmMemView = new Uint8Array(this.wasmMem.buffer);
        wasmMemView.set(data, offset);
        return offset;
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
        this.currentCtx.method
        //console.log("IsCallable:",this.currentCtx.method,this.isCallable(this.currentCtx.method));
        const runResult = (this.wasmInstance!.exports[methodToRun] as CallableFunction)(...args);
        return runResult;
    }
    isCallable(method:string):boolean {
        this.instantiate();
        try {
            const method_bytes = new Uint8Array(Utils.mpEncode(method));
            const method_bytes_offset = this.writeToWasmMem(method_bytes);
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
        //console.log("IsCallable",this.currentCtx.method,this.isCallable(this.currentCtx.method));
        const runResult =  this.callExportedMethod('run', ctxOffset, ctxBytes.byteLength, argsOffset, argsBytes.byteLength);
        return (this.decodeResult(runResult));
    }
}

export default WasmMachine;
