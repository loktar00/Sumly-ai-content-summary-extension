// API interactions
import { CONSTANTS } from '@/constants.ts';
import { storage } from "@/utils/storage";

export const api = {
    async getApiUrl() {
        const { apiUrl } = await storage.get("apiUrl");
        return apiUrl || CONSTANTS.API.DEFAULT_API_URL;
    },

    async getAiSettings() {
        const settings = await storage.get(['aiUrl', 'aiModel', 'numCtx']);

        return {
            url: settings.aiUrl || CONSTANTS.API.DEFAULT_AI_URL,
            model: settings.aiModel || CONSTANTS.API.DEFAULT_AI_MODEL,
            numCtx: settings.numCtx || CONSTANTS.API.DEFAULT_NUM_CTX
        };
    }
};