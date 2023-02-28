import {
    HostFunctions,
    MsgPack,
} from './sdk';

/**
 * Class to help manage an account's balance represented by a numeric (u64) value
 */
export class AccountAssetU64 {
    private _accountId: string = '';
    private _clearOnZero: bool = true;

    /**
     * @param accountId - account you want to manage
     * @param clearOnZero - set to true to completely delete asset data when balance reaches 0. Otherwise 0 continues being stored as asset value and shows when you try to get account data from blockchain. True by default.
     */
    constructor(accountId: string, clearOnZero: bool = true) {
        this._accountId = accountId;
        this._clearOnZero = clearOnZero;
    }

    /** Completely removes account's asset data. */
    clear(): void {
        HostFunctions.removeAsset(this._accountId);
    }

    /**
     * Sets account's asset balance to a new value.
     * @param value - new value
     * @param clearOnZero - whether to clear balance when it is set to 0 zero. Defaults to value set in constructor.
     */
    set(value: u64, clearOnZero: bool = this._clearOnZero): void {
        if (clearOnZero && value <= 0) {
            this.clear();
            return;
        }
        HostFunctions.storeAsset(this._accountId, MsgPack.serializeInternalType(value));
    }

    /**
     * Returns account balance. If no asset data are present then 0 is assumed.
     */
    balance(): u64 {
        let result: u64 = 0;
        const assetBytes = HostFunctions.loadAsset(this._accountId);
        if(assetBytes.length > 0) {
            result = MsgPack.deserializeInternalType<u64>(assetBytes);
        }
        return result;
    }

    /**
     * Increases managed account's balance by amount.
     * @param value - value to add to balance
     * @returns - false(no data changes) if overflow occurs (resulting value greater than 0xffffffffffffffff). True otherwise.
     */
    add(value: u64): bool {
        if (value <= 0) {
            return true;
        }
        const currBalance = this.balance();
        const max: u64 = 0xffffffffffffffff - currBalance;
        if (value > max) {
            return false;
        }
        this.set(currBalance + value);
        return true;
    }

    /**
     * Decreases managed account's balance by amount
     * @param value value to remove from balance
     * @param clearOnZero - whether to clear balance when it reaches zero. Defaults to value set in constructor.
     * @returns - false if balance in not enough (no data change). True otherwise.
     */
    sub(value: u64, clearOnZero: bool = this._clearOnZero): boolean {
        const currBalance = this.balance();
        if (value <= 0) {
            return true;
        }
        if (currBalance < value) {
            return false;
        }
        this.set(currBalance - value);
        return true;
    }
}

export class OwnerDB {

    static get<T>(key:string):T {
        const valSer = HostFunctions.loadData(key);
        return  MsgPack.deserializeInternalType<T>(valSer);
    }

    static set<T>(key:string,val:T):u8[] {
        const valSer = MsgPack.serializeInternalType<T>(val);
        HostFunctions.storeData(key,valSer);
        return valSer;
    }

    static getObject<T>(key:string):T {
        const valSer = HostFunctions.loadData(key);
        return  MsgPack.deserialize<T>(valSer);
    }

    static setObject<T>(key:string,val:T):u8[] {
        const valSer = MsgPack.serialize<T>(val);
        HostFunctions.storeData(key,valSer);
        return valSer;
    }

    static has(key:string):boolean {
        const ret = HostFunctions.getKeys(`${key}*`);
        return ret.indexOf(key) >= 0;
    }

    static delete(key:string):boolean {
        if(this.has(key)) {
            HostFunctions.removeData(key);
            return true;
        }
        return false;
    }
}