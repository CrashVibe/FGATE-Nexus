import { wsServerManager } from '../utils/adapters/onebot/wsOnebotManager';

export default defineNitroPlugin(async () => {
    await wsServerManager.initAllAdapters();
});
