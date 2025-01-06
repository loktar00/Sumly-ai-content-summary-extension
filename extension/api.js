// API interactions
import { CONSTANTS } from './constants.js';

export const api = {
    async getApiUrl() {
        const { apiUrl } = await chrome.storage.sync.get("apiUrl");
        return apiUrl || CONSTANTS.API.DEFAULT_API_URL;
    },

    async getAiSettings() {
        const { aiUrl, aiModel, numCtx } = await chrome.storage.sync.get([
            "aiUrl",
            "aiModel",
            "numCtx"
        ]);

        return {
            url: `${aiUrl || CONSTANTS.API.DEFAULT_AI_URL}`,
            model: aiModel || CONSTANTS.API.DEFAULT_AI_MODEL,
            numCtx: numCtx || CONSTANTS.API.DEFAULT_NUM_CTX
        };
    },

    async getSystemPrompt() {
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');
        const defaultPrompt = Object.entries(savedPrompts)
            .find(([, prompt]) => prompt.isDefault);

        return defaultPrompt ? defaultPrompt[1].content : CONSTANTS.API.DEFAULT_SYSTEM_PROMPT;
    }
};