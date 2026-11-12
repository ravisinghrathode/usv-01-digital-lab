declare module 'ws' {
  import { EventEmitter } from 'events';
  import * as http from 'http';
  import * as https from 'https';

  export class WebSocket extends EventEmitter {
    static OPEN: number;
    static CLOSED: number;
    readyState: number;
    send(data: any, cb?: (err?: Error) => void): void;
    close(code?: number, reason?: string): void;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: { server?: http.Server | https.Server; noServer?: boolean; path?: string; [key: string]: any });
    clients: Set<WebSocket>;
    close(cb?: (err?: Error) => void): void;
    handleUpgrade(request: http.IncomingMessage, socket: any, head: Buffer, callback: (ws: WebSocket) => void): void;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  export default WebSocket;
}
