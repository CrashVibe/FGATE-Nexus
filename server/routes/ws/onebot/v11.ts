import { defineWebSocketHandler } from 'h3';
import { unifiedAdapterManager } from '~/server/utils/adapters/core/UnifiedAdapterManager';

export default defineWebSocketHandler({
    async open(peer) {
        await unifiedAdapterManager.handleConnection(
            peer as unknown as import('crossws').Peer<import('crossws').AdapterInternal>
        );
    },

    message(peer, message) {
        unifiedAdapterManager.handleMessage(
            peer as unknown as import('crossws').Peer<import('crossws').AdapterInternal>,
            message
        );
    },

    close(peer) {
        unifiedAdapterManager.handleClose(peer as unknown as import('crossws').Peer<import('crossws').AdapterInternal>);
    }
});
