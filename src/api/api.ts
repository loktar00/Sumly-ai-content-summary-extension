// API interactions
import { storage } from "@/utils/storage";
import { modelProviders } from '@/Configs/ModelProviders';

export const api = {
    async getApiSettings() {
        const settings = await storage.sync.get(['selectedProvider', 'providerConfigs']);
        const provider = settings.selectedProvider || 'Ollama';
        const configs = settings.providerConfigs || modelProviders;

        return {
            provider,
            ...configs[provider]
        };
    },

    async getApiKey() {
        const settings = await this.getApiSettings();
        return settings.api_key;
    }
};