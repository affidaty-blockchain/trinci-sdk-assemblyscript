import fs from "fs";
import Table from 'cli-table';

import { getRefHash } from "./utils";

export interface IWasmPathWithName { path: string, name?: string };
export class trinciDB {
    dataDb: Map<string, Map<string, Uint8Array>>; // <Account1, Map(<dataKey,val>)>
    assetDb: Map<string, Map<string, Uint8Array>>; // <Account1, Map(<assetAccount,val>)>
    wasmModulesIndex: Map<string, { module: WebAssembly.Module, name: string }>; // <refHash1, {name, wasmModule1}>
    accountBindings: Map<string, string>; // <Account1, ContractRefHash1>
    constructor() {
        this.dataDb = new Map();
        this.assetDb = new Map();
        this.wasmModulesIndex = new Map();
        this.accountBindings = new Map();
    }
    printAssets() {
        const {allAccounts,table} = this._preparePrint();
        const allAccountsArray:string[] = Array.from(allAccounts);
        for(let acc of allAccountsArray) {
            table.push(allAccountsArray.map((a) => {
                if(this.assetDb.has(a)) {
                    const accountMap = this.assetDb.get(a);
                    const result = accountMap.get(acc) || 0;
                    if(typeof result == "number") {
                        return result;
                    } else {
                        //TODO: messagePackDecode
                    }
                }
                return 0;
            }));
        }
        console.log(table.toString());
    }
    private _preparePrint():any {
        const dataAccounts = [...this.dataDb.keys()];
        const assetAccounts = [...this.assetDb.keys()];
        const allAccounts = new Set<string>(...dataAccounts, ...assetAccounts);
        // remove TRINCI account
        allAccounts.delete("TRINCI");

        const table :Table= new Table({
            head: Array.from(allAccounts).map(t => {
                if (this.accountBindings.has(t)) {
                    return t + "\n (" + this.accountBindings.get(t) + ")";
                } else {
                    return t + "\n ( --  )";
                }
            })
            , colWidths: [100, 200]
        });
        return {allAccounts,table};
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
        const wasmBuffer = fs.readFileSync(typeof wasmFilePath == 'string' ? wasmFilePath : wasmFilePath.path);
        const refHash = getRefHash(wasmBuffer);
        const module = await WebAssembly.compile(wasmBuffer);
        const name = typeof wasmFilePath == 'string' ? '' : (wasmFilePath.name ? wasmFilePath.name : '');
        this.wasmModulesIndex.set(refHash, { module, name });
        if (accountId) {
            this.bindContractToAccount(accountId, refHash);
        }
        return refHash;
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
