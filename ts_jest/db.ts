import fs from "fs";
import Table from 'cli-table';

import { getRefHash, mpDecode, mpEncode } from "./utils";

export interface IWasmPathWithName { path: string, name?: string };
export class trinciDB {
    dataDb: Map<string, Map<string, Uint8Array>>; // <Account1, Map(<dataKey,val>)>
    assetDb: Map<string, Map<string, Uint8Array>>; // <Account1, Map(<assetAccount,val>)>
    wasmModulesIndex: Map<string, { module: WebAssembly.Module, name: string }>; // <refHash1, {name, wasmModule1}>
    accountBindings: Map<string, string>; // <Account1, ContractRefHash1>
    wasmFilesRef: Map<string, string>; // <Account1, ContractRefHash1>
    constructor() {
        this.dataDb = new Map();
        this.assetDb = new Map();
        this.wasmModulesIndex = new Map();
        this.accountBindings = new Map();
        this.wasmFilesRef = new Map();
    }
    fork():trinciDB {
        let backUp = new trinciDB();
        const tmpDataMap: Map<string, Map<string, Uint8Array>> = new Map();
        const tmpAssetMap: Map<string, Map<string, Uint8Array>> = new Map(); // <Account1, Map(<assetAccount,val>)>
        let keys =[ ...this.dataDb.keys() ];
        for(let k of keys) {
            tmpDataMap.set(k,new Map(this.dataDb.get(k)));
        }
        keys =[ ...this.assetDb.keys() ];
        for(let k of keys) {
            tmpAssetMap.set(k,new Map(this.assetDb.get(k)));
        }
        backUp.dataDb = tmpDataMap;
        backUp.assetDb = tmpAssetMap;
        backUp.wasmModulesIndex = new Map(this.wasmModulesIndex);
        backUp.accountBindings = new Map(this.accountBindings);
        backUp.wasmFilesRef = new Map(this.wasmFilesRef);
        return backUp;
    }
    mpDecode(data:Uint8Array):any {
        return mpDecode(data);
    }
    mpEncode(data:any):Uint8Array {
        return mpEncode(data);
    }
    getDataFromOwnerDB(ownerDB:string,key:string):any {
        if (this.dataDb.has(ownerDB)) {
            const ownerDBMap = this.dataDb.get(ownerDB);
            if(ownerDBMap!.has(key)) {
                return mpDecode(ownerDBMap!.get(key) as Uint8Array);
            }
        }
        return null;
    }
    printData(accountId:string) {
        const table :Table= new Table({
            head: ["#key",accountId].map(t => {
                if(t == "#key") {
                    return "";
                } else if(this.accountBindings.has(t)) {
                    const hash =this.accountBindings.get(t)!;
                    const fileName = this.wasmFilesRef.get(hash)!.split("/").pop();

                    return t + "\n(" + fileName + ")";
                } else {
                    return t + "\n( -- )";
                }
            })
        });
        table.push(["Key","MessagePackDecode(data)"]);
        if (this.dataDb.has(accountId)) {
            const accountData = this.dataDb.get(accountId);
            const keys:string[] = [...accountData!.keys()];
            for(let k of keys) {
                table.push([k,JSON.stringify(mpDecode(accountData!.get(k) as Uint8Array))]);
            }
        }
        console.log(table.toString());
    }
    printAssets() {
        const {allAccounts,table,headAccounts} = this._preparePrint();
        const allAccountsArray:string[] = Array.from(allAccounts);
        for(let rowAccount of allAccountsArray) {
            const amounts = headAccounts.map((colAccount:string) => {
                if(this.assetDb.has(rowAccount)) {
                    const assetMap = this.assetDb.get(rowAccount)!;
                    if(assetMap.has(colAccount)) {
                        return JSON.stringify(this.balance(colAccount,rowAccount));
                    } else {
                        return "--";
                    }
                } else {
                    return "--";
                }
                
            });
            table.push([rowAccount,...amounts]);
        }
        console.log(table.toString());
    }
    private _preparePrint():any {
        const dataAccounts = [...this.dataDb.keys()];
        const accountBindings = [...this.accountBindings.keys()];
        const assetAccounts = [...this.assetDb.keys()];
        
        const allAccounts = new Set<string>([...accountBindings, ...assetAccounts,...dataAccounts]);
        // remove TRINCI account
        allAccounts.delete("TRINCI");
        
        const headAccounts: string[] =  Array.from(allAccounts).filter(t => this.accountBindings.has(t));
        const table :Table= new Table({
            head: ["#",...headAccounts].map(t => {
                if(t == "#") {
                    return "#";
                } else if (this.accountBindings.has(t)) {
                    const hash =this.accountBindings.get(t)!;
                    const fileName = this.wasmFilesRef.get(hash)!.split("/").pop();
                    return t + "\n(" + fileName + ")";
                } else {
                    return t + "\n( -- )";
                }
            })
           // , colWidths: [10, 20]
        });
        return {allAccounts,table,headAccounts};
    }
    /**
     * take buffer from file and register it into DB , use as key the hash of file
     * if accountId has passed as optional field, the account will mapped with the same Smart Contract
     *
     * @param {string} wasm_file
     * @param {string} [accountId]
     * @return {*}  {string}
     * @memberof trinciDB
     */
    async registerContract(wasmFilePath: string | IWasmPathWithName, accountId?: string): Promise<string> {
        const wasmSource = typeof wasmFilePath == 'string' ? wasmFilePath : wasmFilePath.path;
        const wasmBuffer = fs.readFileSync(wasmSource);
        const refHash = getRefHash(wasmBuffer);
        this.wasmFilesRef.set(refHash,wasmSource);
        const module = await WebAssembly.compile(wasmBuffer);
        const name = typeof wasmFilePath == 'string' ? '' : (wasmFilePath.name ? wasmFilePath.name : '');
        this.wasmModulesIndex.set(refHash, { module, name });
        if (accountId) {
            this.bindContractToAccount(accountId, refHash);
        }
        return refHash;
    }
    balance(coinAccount:string,accountId:string):number {
        if(this.assetDb.has(accountId)) {
            const acc = this.assetDb.get(accountId)!;
            if(acc.has(coinAccount)) {
                const result = acc.get(coinAccount)!;
                return mpDecode(result as Uint8Array);
            } else {
                return 0;
            }   
        }
        return 0;
    }
    /**
     * check if smart contract exists
     *
     * @param {string} hash
     * @return {*}  {boolean}
     * @memberof trinciDB
     */
    contractRegistered(refHash: string): boolean {
        return this.wasmModulesIndex.has(refHash);
    }

    /**
     * get the wasm file buffer of a specific hash
     *
     * @param {string} hash
     * @return {*}  {(Buffer | null)}
     * @memberof trinciDB
     */
    getContractModule(refHash: string): WebAssembly.Module | null {
        const module = this.wasmModulesIndex.get(refHash)
        if (module) {
            return module.module
        }
        return null;
    }

    /**
     * map an account with specific smart contract, in this project anyone can overrite this map
     *
     * @param {string} accountId
     * @param {string} hash
     * @return {*}  {boolean}
     * @memberof trinciDB
     */
    bindContractToAccount(accountId: string, refHash: string): boolean {
        if (!this.contractRegistered(refHash)) {
            return false;
        }
        this.accountBindings.set(accountId, refHash);
        return true;
    }

    getAccountContractHash(accountId: string): string | null {
        const refHash = this.accountBindings.get(accountId);
        if (!refHash) {
            return null;
        }
        return refHash;
    }

    getAccountContractModule(accountId: string): WebAssembly.Module | null {
        const hash = this.getAccountContractHash(accountId);
        if (!hash) {
            return null;
        }
        const module = this.getContractModule(hash);
        return module;
    }

    setAccountData(accountId: string, key: string, data: Uint8Array): void {
        let accountDataDb = this.dataDb.get(accountId);
        if (!accountDataDb) {
            accountDataDb = new Map<string, Uint8Array>();
        }
        accountDataDb.set(key, data);
        this.dataDb.set(accountId, accountDataDb);
        return;
    }

    getAccountData(accountId: string, key: string): Uint8Array | null {
        if (!this.dataDb.has(accountId)) {
            return null;
        }
        const data = this.dataDb.get(accountId)!.get(key);
        if (!data) {
            return null;
        }
        return data;
    }

    removeAccountData(accountId: string, dataKey: string): void {
        const accountDataDb = this.dataDb.get(accountId)!;
        if (accountDataDb) {
            if (accountDataDb.delete(dataKey)) {
                this.dataDb.set(accountId, accountDataDb);
            }
        }
        return;
    }

    setAccountAsset(ownerAccountId: string, assetAccountId: string, assetData: Uint8Array): void {
        let accountAssetDb = this.assetDb.get(ownerAccountId);
        if (!accountAssetDb) {
            accountAssetDb = new Map<string, Uint8Array>();
        }
        accountAssetDb.set(assetAccountId, assetData);
        this.assetDb.set(ownerAccountId, accountAssetDb);
        return;
    }

    removeAccountAsset(ownerAccountId: string, assetAccountId: string): void {
        let accountAssetDb = this.assetDb.get(ownerAccountId);
        if (accountAssetDb && accountAssetDb.has(assetAccountId)) {
            accountAssetDb.delete(assetAccountId);
        }
        return;
    }

    getAccountAsset(ownerAccountId: string, assetAccountId: string): Uint8Array | null {
        if (!this.assetDb.has(ownerAccountId)) {
            return null;
        }
        const data = this.assetDb.get(ownerAccountId)!.get(assetAccountId);
        if (!data) {
            return null;
        }
        return data;
    }

    getAccountDataKeys(accountId: string, pattern: string = '*'): string[] {
        const resultList: string[] = [];
        const accountDataDb = this.dataDb.get(accountId);
        if (!accountDataDb) {
            return [];
        }
        if (!pattern.includes("*")) {
            if (!accountDataDb.has(pattern)) {
                return [];
            }
            return [pattern];
        }
        const accountDataKeys = [...accountDataDb.keys()];
        if (accountDataKeys.length <= 0) {
            return [];
        }
        const patternSubstring = pattern.substring(0, pattern.indexOf('*') >= 0 ? pattern.indexOf('*') : 0);
        if (patternSubstring.length == 0) {
            return accountDataKeys;
        }
        for (let i = 0; i < accountDataKeys.length; i++) {
            if (accountDataKeys[i].startsWith(patternSubstring)) {
                resultList.push(accountDataKeys[i]);
            }
        }
        return resultList;
    }
}

export default trinciDB;
