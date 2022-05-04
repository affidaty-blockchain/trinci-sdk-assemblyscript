import EventEmitter from 'events';
import { ITxEvent } from '@affidaty/t2-lib';

export type wasmEventType = 'txEvent';

export default class WasmEventEmitter extends EventEmitter {
    /* eslint-disable no-dupe-class-members */
    emit(eventType: 'txEvent', eventArgs: ITxEvent): boolean;

    emit(eventType: wasmEventType, ...args: any[]): boolean {
        return super.emit(eventType, ...args);
    }

    on(eventType: 'txEvent', listener: (eventArgs: ITxEvent) => void): this;

    on(eventType: wasmEventType, listener: (...args: any[]) => void): this {
        return super.on(eventType, listener);
    }

    once(eventType: 'txEvent', listener: (eventArgs: ITxEvent) => void): this;

    once(eventType: wasmEventType, listener: (...args: any[]) => void): this {
        return super.once(eventType, listener);
    }
    /* eslint-enable no-dupe-class-members */
}