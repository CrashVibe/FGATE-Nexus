import type { Peer, AdapterInternal } from 'crossws';

export interface ConnectionInfo {
  peer: Peer<AdapterInternal>;
}

class ConnectionManager {
  private static instance: ConnectionManager;
  private connections = new Map<number, ConnectionInfo>();

  private constructor() {}

  static getInstance() {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  add(botId: number, peer: Peer<AdapterInternal>) {
    this.connections.set(botId, { peer });
  }

  remove(botId: number) {
    this.connections.delete(botId);
  }

  disconnect(botId: number) {
    const info = this.connections.get(botId);
    if (info) {
      try {
        info.peer.close(4000, 'adapter disabled or removed');
        console.log(`Closed connection for bot ${botId}`);
      } catch {
        // ignore
      }
      console.log(`Disconnected bot ${botId}`);
      this.connections.delete(botId);
    }
  }

  has(botId: number): boolean {
    return this.connections.has(botId);
  }
}

export const onebotConnectionManager = ConnectionManager.getInstance();
