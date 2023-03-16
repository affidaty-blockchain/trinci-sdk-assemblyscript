import fs from "fs";
import Table from 'cli-table';

import {
    getRefHash,
    mpDecode,
    mpEncode,
} from "./utils";

export interface IWasmPathWithName { path: string, name?: string };

/** Mocked trinci node database */
export class TrinciDB {
    /** Database containing key-value pairs collection for each account accessible only by the account's own smart contract. */
    dataDb: Map<string, Map<string, Uint8Array>>; // <AccountId, Map<dataKey,val>>

    /** Database containing asset data collection for each account accessible by smart contracts from other accounts. */
    assetDb: Map<string, Map<string, Uint8Array>>; // <AccountId, Map(<assetAccount,val>)>

    /** Map containing HexHash->WASM pair for each registered contract */
    wasmModulesIndex: Map<string, { module: WebAssembly.Module, name: string }>; // <refHash, {name, wasmModule}>

    /** Links between accounts and smart contracts */
    accountBindings: Map<string, string>; // <AccountId, ContractRefHash>

    /** Links between contract hashes and paths to wasm files.*/
    wasmFilesRef: Map<string, string>; // <RefHashHex, contractWasmFilePath>

    constructor() {
        this.dataDb = new Map<string, Map<string, Uint8Array>>();
        this.assetDb = new Map<string, Map<string, Uint8Array>>();
        this.wasmModulesIndex = new Map<string, { module: WebAssembly.Module, name: string }>();
        this.accountBindings = new Map<string, string>();
        this.wasmFilesRef = new Map<string, string>();
    }

    /** Returns a copy of db.*/
    fork():TrinciDB {
        const fork = new TrinciDB();
        let keys = [ ...this.dataDb.keys() ];
        for(let k of keys) {
            fork.dataDb.set(k,new Map(this.dataDb.get(k)));
        }
        keys = [ ...this.assetDb.keys() ];
        for(let k of keys) {
            fork.assetDb.set(k,new Map(this.assetDb.get(k)));
        }
        fork.wasmModulesIndex = new Map(this.wasmModulesIndex);
        fork.accountBindings = new Map(this.accountBindings);
        fork.wasmFilesRef = new Map(this.wasmFilesRef);
        return fork;
    }

    /**
     * Reads smart contract file and stores it's compiled wasm module linked to it's hash. Can be accessed using getContractModule() method
     *
     * @param wasmFilePath - can be a plain string containing path to wasm file or an object \{ path: string, name?: string \} where a custom alias name can be specified.
     * @param accountId - specify this if newly registered smart contract needs to be immediately bound to an account.
     * @returns - newly registered smart contract hash
     */
    async registerContract(wasmFilePath: string | IWasmPathWithName, accountId?: string): Promise<string> {
        const wasmSource = typeof wasmFilePath == 'string' ? wasmFilePath : wasmFilePath.path;
        const wasmBuffer = fs.readFileSync(wasmSource);
        const refHash = getRefHash(wasmBuffer);
        this.wasmFilesRef.set(refHash,wasmSource);
        const module = await WebAssembly.compile(wasmBuffer);
        const name = typeof wasmFilePath == 'string' ? '' : (wasmFilePath.name ? wasmFilePath.name : '');
        this.wasmModulesIndex.set(refHash, { module, name });
        if (typeof accountId == 'string' && accountId.length > 0) {
            this.bindContractToAccount(accountId, refHash);
        }
        return refHash;
    }

    /**
     * Check if a smart contract with a hash has been registered
     * @param refHash - smart contract hash
     */
    contractRegistered(refHash: string): boolean {
        if (refHash.length <= 0) return false;
        return this.wasmModulesIndex.has(refHash);
    }


    /**
     * Returns compiled wasm module(if any) relative to a passed hash.
     * @param refHash - smart contract hash returned by registerContract() method
     */
    getContractModule(refHash: string): WebAssembly.Module | null {
        if (!this.contractRegistered(refHash)) {
            return null;
        }
        return this.wasmModulesIndex.get(refHash)!.module;
    }

    /**
     * Binds an account to a specific smart contract.
     *
     * @param accountId - id of the account you want to bind to a smart contract
     * @param refHash - hash of the smart contract you want to bind
     */
    bindContractToAccount(accountId: string, refHash: string): boolean {
        if (!this.contractRegistered(refHash)) {
            return false;
        }
        this.accountBindings.set(accountId, refHash);
        return true;
    }

    /** Returns smart contract hash bound to an account */
    getAccountContractHash(accountId: string): string | null {
        const refHash = this.accountBindings.get(accountId);
        if (!refHash) {
            return null;
        }
        return refHash;
    }

    /** Returns compiled webassembly module of the smart contract bound to an account */
    getAccountContractModule(accountId: string): WebAssembly.Module | null {
        const hash = this.getAccountContractHash(accountId);
        if (!hash) {
            return null;
        }
        const module = this.getContractModule(hash);
        return module;
    }

    /** Allows to set account data */
    setAccountData(ownerAccountId: string, dataKey: string, data: Uint8Array): void {
        let accountDataDb = this.dataDb.has(ownerAccountId)
            ? this.dataDb.get(ownerAccountId)!
            : new Map<string, Uint8Array>();

        accountDataDb.set(dataKey, data);
        this.dataDb.set(ownerAccountId, accountDataDb);
        return;
    }

    /** Serializes a value using MessagePack and saves it as asset data on an account */
    setAccountDataPacked(ownerAccountId: string, dataKey: string, data: any): void {
        const dataBytes = new Uint8Array(mpEncode(data));
        return this.setAccountData(ownerAccountId, dataKey, dataBytes);
    }

    /** Returns account data under a specific key */
    getAccountData(ownerAccountId: string, dataKey: string): Uint8Array | null {
        if (!this.dataDb.has(ownerAccountId)
            || !this.dataDb.get(ownerAccountId)!.has(dataKey)
        ) {
            return null;
        }
        return this.dataDb.get(ownerAccountId)!.get(dataKey)!;
    }

    /** Loads specific asset data from an account and decodes it using MessagePack*/
    getAccountDataPacked(ownerAccountId: string, dataKey: string): any {
        const dataBytes = this.getAccountAsset(ownerAccountId, dataKey);
        if (dataBytes === null || dataBytes.length <= 0) {
            return undefined;
        }
        return mpDecode(dataBytes);
    }

    /** Clears account data under a specific key. */
    removeAccountData(ownerAccountId: string, dataKey: string): void {
        const accountDataDb = this.dataDb.get(ownerAccountId)!;
        if (accountDataDb) {
            if (accountDataDb.delete(dataKey)) {
                this.dataDb.set(ownerAccountId, accountDataDb);
            }
        }
        return;
    }

    /**
     * Returns all data keys matching a pattern from an account.  
     * Pattern: '\<starting substring\>*'  
     * Valid patterns example:  
     * '\*' - returns all keys  
     * 'my_data' - returns only 'my_data' key(if any, otherwise empty array)  
     * 'my_data\*' - returns all keys starting with 'my_data' (e.g. 'my_data_new' will be returned while 'my_new_data' will be not)
     * @param ownerAccountId - account id to get keys from
     * @param pattern - pattern to match. symbol '*' (if any) must be at the end of the pattern string
     */
    getAccountDataKeys(ownerAccountId: string, pattern: string = '*'): string[] {
        const resultList: string[] = [];
        const accountDataDb = this.dataDb.get(ownerAccountId);
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
        if (accountDataKeys.length <= 0) return [];
        const patternSubstring = pattern.substring(
            0,
            pattern.indexOf('*') >= 0 ? pattern.indexOf('*') : 0,
        );
        if (patternSubstring.length == 0) return accountDataKeys;
        for (let i = 0; i < accountDataKeys.length; i++) {
            if (accountDataKeys[i].startsWith(patternSubstring)) {
                resultList.push(accountDataKeys[i]);
            }
        }
        return resultList;
    }

    /** Saves specific asset data on an account */
    setAccountAsset(ownerAccountId: string, assetAccountId: string, assetData: Uint8Array): void {
        let accountAssetDb = this.assetDb.get(ownerAccountId);
        if (!accountAssetDb) {
            accountAssetDb = new Map<string, Uint8Array>();
        }
        accountAssetDb.set(assetAccountId, assetData);
        this.assetDb.set(ownerAccountId, accountAssetDb);
        return;
    }

    /** Serializes a value using MessagePack and saves it as asset data on an account */
    setAccountAssetPacked(ownerAccountId: string, assetAccountId: string, assetData: any): void {
        const assetBytes = new Uint8Array(mpEncode(assetData));
        return this.setAccountAsset(ownerAccountId, assetAccountId, assetBytes);
    }

    /** Loads specific asset data from an account */
    getAccountAsset(ownerAccountId: string, assetAccountId: string): Uint8Array | null {
        if (!this.assetDb.has(ownerAccountId)) return null;
        const data = this.assetDb.get(ownerAccountId)!.get(assetAccountId);
        if (!data) return null;
        return data;
    }

    /** Loads specific asset data from an account and decodes it using MessagePack*/
    getAccountAssetPacked(ownerAccountId: string, assetAccountId: string): any | undefined {
        const assetBytes = this.getAccountAsset(ownerAccountId, assetAccountId);
        if (assetBytes === null || assetBytes.length <= 0) {
            return undefined;
        }
        return mpDecode(assetBytes);
    }

    /** Removes specific asset data from an account */
    removeAccountAsset(ownerAccountId: string, assetAccountId: string): void {
        let accountAssetDb = this.assetDb.get(ownerAccountId);
        if (accountAssetDb && accountAssetDb.has(assetAccountId)) {
            accountAssetDb.delete(assetAccountId);
        }
        return;
    }

    printData(accountId: string) {
        const table :Table= new Table({
            head: ["#key",accountId].map(t => {
                if(t == "#key") return "";
                else if(this.accountBindings.has(t)) {
                    const hash =this.accountBindings.get(t)!;
                    const fileName = this.wasmFilesRef.get(hash)!.split("/").pop();
                    return t + "\n(" + fileName + ")";
                } else return t + "\n( -- )";
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

    printAssets() {
        const {allAccounts,table,headAccounts} = this._preparePrint();
        const allAccountsArray:string[] = Array.from(allAccounts);
        for(let rowAccount of allAccountsArray) {
            const amounts = headAccounts.map((colAccount:string) => {
                if(this.assetDb.has(rowAccount)) {
                    const assetMap = this.assetDb.get(rowAccount)!;
                    if(assetMap.has(colAccount)) {
                        return JSON.stringify(this.getAccountAssetPacked(colAccount,rowAccount));
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
}

export default TrinciDB;
