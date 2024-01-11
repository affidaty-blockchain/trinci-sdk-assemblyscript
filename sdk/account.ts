// import {
//     HostFunctions,
//     MsgPack,
// } from './sdk';

import * as MsgPack from './msgpack';
import * as HostFunctions from './env';

const ERR_OVERFLOW = 'value overflow';
const ERR_NOTENOUGHBALANCE = 'insufficient balance';

/**
 * A helper class for managing another account's asset data as a numeric (u64) value
 */
export class AccountAssetU64 {
    accountId: string;
    clearOnZero: bool;
    currValue: u64;
    error: string;
    isError: bool;

    /**
     * @param accountId - account you want to manage
     * @param clearOnZero - Default: `true`. Set to true to completely delete asset data when value reaches 0. Otherwise 0 continues being stored as asset value and shows when you try to get account data from blockchain.
     */
    constructor(accountId: string, clearOnZero: bool = true) {
        this.accountId = accountId;
        this.clearOnZero = clearOnZero;
        this.currValue = 0;
        this.error = '';
        this.isError = false;
    }

    private setError(errMsg: string): AccountAssetU64 {
        this.isError = true;
        this.error = errMsg;
        return this;
    }

    /** Resets error state and clear error message */
    clearError(): AccountAssetU64 {
        this.isError = false;
        this.error = '';
        return this;
    }

    /**
     * Increases managed account's balance by amount. Use `write` method to save new value to blockchain.
     * Check `isError()` for value overflow
     * @param value - value to add to balance
     */
    add(value: u64): AccountAssetU64 {
        if (value <= 0) {
            return this;
        }
        const maxValue: u64 = 0xffffffffffffffff - this.currValue;
        if (value > maxValue) {
            this.setError(ERR_OVERFLOW);
        } else {
            this.currValue += value;
        }
        return this;
    }

    /**
     * Decreases managed account's balance by amount. . Use `write` method to save new value to blockchain.
     * Check `.isError()` for insufficient balance
     * @param value value to remove from balance
     */
    sub(value: u64): AccountAssetU64 {
        if (value <= 0) {
            return this;
        }
        if (this.currValue < value) {
            this.setError(ERR_NOTENOUGHBALANCE);
        } else {
            this.currValue -= value
        }
        return this;
    }

    /**
     * Sets a specific current value. Use `write` method to save new value to blockchain.
     * @param newValue value to set as current
     */
    setValue(newValue: u64): AccountAssetU64 {
        this.currValue = newValue
        return this;
    }

    /**
     * Read asset data from blockchain. If no asset data are present then 0 is assumed.
     * Check `.isError()` for deserialization errors
     */
    read(): AccountAssetU64 {
        const assetBytes = HostFunctions.loadAsset(this.accountId);
        if(assetBytes.byteLength > 0) {
            let newValue = MsgPack.deserializeInternalType<u64>(assetBytes);
            if (MsgPack.isError()) {
                this.setError(`Asset value deserialization error: ${MsgPack.errorMessage}`);
            } else {
                this.currValue = newValue;
            }
        }
        return this;
    }

    /**
     * Writes account's asset current balance value. Completely deletes asset data if necessary
     * @param clearOnZero - whether to clear balance when it is set to 0 zero. Defaults to value set in constructor.
     */
    write(clearOnZero: bool = this.clearOnZero): AccountAssetU64 {
        if (clearOnZero && this.currValue <= 0) {
            this.removeAssetData();
        } else {
            HostFunctions.storeAsset(this.accountId, MsgPack.serializeInternalType(this.currValue));
        }
        return this;
    }

    /** Completely removes account's asset data from blockchain. */
    removeAssetData(): AccountAssetU64 {
        HostFunctions.removeAsset(this.accountId);
        return this;
    }
}

export class OwnerDB {
    static isError: bool = false;
    static error: string = '';

    private static setError(errMsg: string): void {
        this.isError = true;
        this.error = errMsg;
    }

    static clearError(): void {
        this.isError = false;
        this.error = '';
    }

    static hasKey(key: string): bool {
        const keysList = HostFunctions.getKeys(`${key}*`);
        return keysList.indexOf(key) >= 0;
    }

    static removeKey(key: string): void {
        HostFunctions.removeData(key);
    }

    static loadInternalType<T>(key: string): T {
        this.clearError();
        const valSer = HostFunctions.loadData(key);
        const result = MsgPack.deserializeInternalType<T>(valSer);
        if (MsgPack.isError()) this.setError(`deserialization error: ${MsgPack.errorMessage}`);
        return result;
    }

    static storeInternaltype<T>(key: string, value: T): void {
        this.clearError();
        HostFunctions.storeData(key, MsgPack.serializeInternalType<T>(value));
    }

    static loadDecorated<T>(key: string): T {
        this.clearError();
        const result =  MsgPack.deserializeDecorated<T>(HostFunctions.loadData(key));
        if (MsgPack.isError()) this.setError(`deserialization error: ${MsgPack.errorMessage}`);
        return result;
    }

    static storeDecorated<T>(key:string, value:T): void {
        this.clearError();
        HostFunctions.storeData(key, MsgPack.serializeDecorated<T>(value));
    }
}