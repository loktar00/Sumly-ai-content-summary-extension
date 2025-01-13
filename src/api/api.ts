// API interactions
import { CONSTANTS } from '@/constants.ts';
import { storage } from "@/utils/storage";

export const api = {
    async getApiKey() {
        const { apiKey } = await storage.sync.get("apiKey");
        return apiKey;
    },

    async getAiSettings() {
        const settings = await storage.sync.get(['aiUrl', 'aiModel', 'numCtx']);

        return {
            url: settings.aiUrl || CONSTANTS.API.DEFAULT_AI_URL,
            model: settings.aiModel || '',
            numCtx: settings.numCtx || CONSTANTS.API.DEFAULT_NUM_CTX
        };
    }
};