import fs from "fs";
import Table from 'cli-table';

import {
    getRefHash,
    bytesToObject,
    objectToBytes,
} from "./utils";
import { binConversions } from "@affidaty/t2-lib";

export interface IWasmPathWithName { path: string, name?: string };
export interface IWasmBinWithName { bin: Uint8Array, name?: string };

type TRemoteAccountsCache = Map<string, {assets: Map<string, Uint8Array>, data: Map<string, Uint8Array>}>
type TDataDb = Map<string, Map<string, Uint8Array>>;
type TAssetsDb = Map<string, Map<string, Uint8Array>>;
type TWasmModulesIndex = Map<string, { module: WebAssembly.Module, name: string }>;
type TAccountBindings = Map<string, string>;
type TWasmFilesRef = Map<string, string>;

/** Mocked trinci node database */
export class TrinciDB {
    time?: number;

    /** Database containing key-value pairs collection for each account accessible only by the account's own smart contract. */
    dataDb: TDataDb; // <AccountId, Map<dataKey,val>>

    /** Database containing asset data collection for each account accessible by smart contracts from other accounts. */
    assetDb: TAssetsDb; // <AccountId, Map(<assetAccount,val>)>

    /** Map containing HexHash->WASM pair for each registered contract */
    wasmModulesIndex: TWasmModulesIndex; // <refHash, {name, wasmModule}>

    /** Links between accounts and smart contracts */
    accountBindings: TAccountBindings; // <AccountId, ContractRefHash>

    /** Links between contract hashes and paths to wasm files.*/
    wasmFilesRef: TWasmFilesRef; // <RefHashHex, contractWasmFilePath>

    /** When cloning an account from remote TRINCi node, it's data will be saved here for eventual subsequent clone q */
    remoteAccountsCache: TRemoteAccountsCache;

    constructor() {
        this.dataDb = new Map<string, Map<string, Uint8Array>>();
        this.assetDb = new Map<string, Map<string, Uint8Array>>();
        this.wasmModulesIndex = new Map<string, { module: WebAssembly.Module, name: string }>();
        this.accountBindings = new Map<string, string>();
        this.wasmFilesRef = new Map<string, string>();
        this.remoteAccountsCache = new Map<string, {assets: Map<string, Uint8Array>, data: Map<string, Uint8Array>}>
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
     * @returns - newly registered smart contract reference hash
     */
    async registerContract(wasmFilePath: string | IWasmPathWithName, accountId?: string): Promise<string> {
        let wasmSource: string;
        let name: string | undefined;
        if (typeof wasmFilePath === 'string') {
            wasmSource = wasmFilePath
        } else {
            wasmSource = wasmFilePath.path;
            if ( typeof wasmFilePath.name === 'string') name = wasmFilePath.name
        }
        const contractCode = new Uint8Array(fs.readFileSync(wasmSource));
        const refHash = getRefHash(contractCode);
        this.wasmFilesRef.set(refHash,wasmSource);
        const module = await WebAssembly.compile(contractCode);
        this.saveContractModule(module, refHash, name);
        if (typeof accountId == 'string' && accountId.length > 0) {
            this.bindContractToAccount(accountId, refHash);
        }
        return refHash;
    }

    /**
     * Compiles smart contract raw binary to a wasm module and links it to it's hash. Can be accessed using getContractModule() method
     *
     * @param wasmBin - can be a plain WebAssembly binary code or an object \{ bin: Uint8Array, name?: string \} where a custom alias name can be specified.
     * @param accountId - specify this if newly registered smart contract needs to be immediately bound to an account.
     * @returns - newly registered smart contract reference hash
     */
    async registerContractBin(wasmBin: Uint8Array | IWasmBinWithName, accountId?: string): Promise<string> {

        let name: string | undefined;
        let contractCode: Uint8Array;

        if (ArrayBuffer.isView(wasmBin)) {
            contractCode = wasmBin
        } else {
            contractCode = wasmBin.bin;
            if (typeof wasmBin.name === 'string') name = wasmBin.name
        }

        const refHash = getRefHash(contractCode);
        this.wasmFilesRef.set(refHash, 'from_binary');
        const module = await WebAssembly.compile(contractCode);
        this.saveContractModule(module, refHash, name);
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
    saveContractModule(module: WebAssembly.Module, refHash: string, name?: string) {
        if (this.contractRegistered(refHash)) {
            return;
        }
        this.wasmModulesIndex.set(refHash, { module, name: typeof name !== 'undefined' ? name : refHash });
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

    /** Allows to save data on an account under a specific key */
    setAccountData(ownerAccountId: string, dataKey: string, data: Uint8Array): void {
        let accountDataDb = this.dataDb.has(ownerAccountId)
            ? this.dataDb.get(ownerAccountId)!
            : new Map<string, Uint8Array>();

        accountDataDb.set(dataKey, data);
        this.dataDb.set(ownerAccountId, accountDataDb);
        return;
    }

    /** Serializes a value using MessagePack and saves it as data on an account under a specific key */
    setAccountDataPacked(ownerAccountId: string, dataKey: string, data: any): void {
        const dataBytes = objectToBytes(data);
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

    /** Loads account data saved under a specific key and decodes it using MessagePack*/
    getAccountDataPacked(ownerAccountId: string, dataKey: string): any {
        const dataBytes = this.getAccountData(ownerAccountId, dataKey);
        if (dataBytes === null || dataBytes.length <= 0) {
            return undefined;
        }
        return bytesToObject(dataBytes);
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
        const assetBytes = objectToBytes(assetData);
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
        return bytesToObject(assetBytes);
    }

    /** Removes specific asset data from an account */
    removeAccountAsset(ownerAccountId: string, assetAccountId: string): void {
        let accountAssetDb = this.assetDb.get(ownerAccountId);
        if (accountAssetDb && accountAssetDb.has(assetAccountId)) {
            accountAssetDb.delete(assetAccountId);
        }
        return;
    }

    printAccountData(accountId: string, printRawData: boolean = false) {
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
        table.push(['Data key', printRawData ? 'Raw data(hex)' : 'Decoded data']);
        if (this.dataDb.has(accountId)) {
            const accountData = this.dataDb.get(accountId);
            const keys:string[] = [...accountData!.keys()];
            for(let k of keys) {
                const data = accountData!.get(k)!;
                table.push([k, (printRawData ? Buffer.from(data).toString('hex') : JSON.stringify(bytesToObject(data)))]);
            }
        }
        console.log(table.toString());
    }

    printAccountAssets(accountId: string, printRawData: boolean = false) {
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
        table.push(['Asset account', printRawData ? 'Raw data(hex)' : 'Decoded data']);
        if (this.assetDb.has(accountId)) {
            const accountAssets = this.assetDb.get(accountId);
            const keys:string[] = [...accountAssets!.keys()];
            for(let k of keys) {
                const data = accountAssets!.get(k)!;
                table.push([k, (printRawData ? Buffer.from(data).toString('hex') : JSON.stringify(bytesToObject(data)))]);
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
        const { allAccounts, table, headAccounts } = this._preparePrint();
        const allAccountsArray: string[] = Array.from(allAccounts);
        for(let rowAccount of allAccountsArray) {
            const amounts = headAccounts.map((colAccount:string) => {
                if(this.assetDb.has(rowAccount)) {
                    const assetMap = this.assetDb.get(rowAccount)!;
                    if(assetMap.has(colAccount)) {
                        const assetData = this.getAccountAssetPacked(rowAccount, colAccount);
                        return JSON.stringify(typeof assetData === 'undefined' ? 'undefined' : assetData);
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

    /** Clears remote accounts cache.
     * @param accountToClear - If defined, only cache relative to that account (if any) will be cleared. otherwise the whole cache will be cleared
    */
    clearRemoteAccountsCache(accountToClear?: string) {
        if (typeof accountToClear === 'string') {
            // clear onlyu that account
            if (this.remoteAccountsCache.has(accountToClear)) {
                this.remoteAccountsCache.delete(accountToClear)
            }
            return;
        }
        this.remoteAccountsCache.clear();
    }

    remoteAccountIsCached(account: string) {
        if (this.remoteAccountsCache.has(account)) {
            return true;
        } else {
            return false;
        }
    }

    /** If chache for the remote account is present, that account will be restored to the state saved in cache */
    restoreAccountFromCache(accountId: string) {
        const accountCache = this.remoteAccountsCache.get(accountId)
        if (typeof accountCache === 'undefined') {
            return;
        }
        const newAccountAssets = new Map<string, Uint8Array>();
        accountCache.assets.forEach((sourceValue, key) => {
            const copyValue = new Uint8Array(new ArrayBuffer(sourceValue.byteLength));
            copyValue.set(sourceValue);
            newAccountAssets.set(key, copyValue)
        });
        const newAccountData = new Map<string, Uint8Array>();
        accountCache.data.forEach((sourceValue, key) => {
            const copyValue = new Uint8Array(new ArrayBuffer(sourceValue.byteLength));
            copyValue.set(sourceValue);
            newAccountData.set(key, copyValue)
        });
        this.assetDb.set(accountId, newAccountAssets);
        this.dataDb.set(accountId, newAccountData)
    }

    /** If chache for the remote account is present, that account will be restored to the state saved in cache */
    updateAccountCache(accountId: string, assets: Map<string, Uint8Array>, data: Map<string, Uint8Array>) {
        this.remoteAccountsCache.set(accountId, {assets, data});
    }
}

export default TrinciDB;
