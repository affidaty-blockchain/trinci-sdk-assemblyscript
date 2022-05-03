const net = require('net');
const t2lib = require('@affidaty/t2-lib');
type SocketArgs = {
    eventTx : string| ArrayBuffer;
    emitterAccount : string| ArrayBuffer;
    emitterSmartContract : string | ArrayBuffer;
}
export class Eventdispatcher {
    eventListener:Map<string,Function[]>;
   socket:string;
   clientSocket:any;
    constructor(socket:string="") {
        this.eventListener = new Map<string,Function[]>();
        this.socket = socket;
        this._connectSocket();
    }
    _connectSocket() {
        if(this.socket) {
            this.clientSocket = new net.Socket();
            this.clientSocket.connect(this.socket, '127.0.0.1');
        }
    }
    listen(eventName:string,callback:Function) {
        const functions = this.eventListener.has(eventName) ? this.eventListener.get(eventName)! : [];
        functions.push(callback);
        this.eventListener.set(eventName,functions);
    }
    emit(eventName:string,data : ArrayBuffer,socketArgs:SocketArgs) {
        if(this.socket) {
            let msg = new t2lib.Message.TrinciMessage(t2lib.MessageTypes.TransactionEvent, {
                eventDataArray: [
                    socketArgs.eventTx,
                    socketArgs.emitterAccount,
                    socketArgs.emitterSmartContract,
                    eventName,
                    data,
                ],
            });
            this.clientSocket.write(msg); // forse to_string? toBuffer?
        }
        if(this.eventListener.has(eventName)) {
            this.eventListener.get(eventName)!.forEach(fun => {
                fun(data);
            });
        }
    }
}

/*
let msg = new TrinciMessage(MessageTypes.TransactionEvent, {
    eventDataArray: [
        eventTx,
        emitterAccount,
        emitterSmartContract,
        eventName,
        eventData,
    ],
});

*/