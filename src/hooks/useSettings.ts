import { useState, useEffect } from 'react';
import { api } from '@/api/api';
import { ModelConfig } from '@/Configs/ModelProviders';

interface UseSettingsReturn {
    settings: ModelConfig | null;
    isLoading: boolean;
    error: string | null;
}

export const useSettings = (): UseSettingsReturn => {
    const [settings, setSettings] = useState<ModelConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const aiSettings = await api.getApiSettings();
                setSettings(aiSettings);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    return { settings, isLoading, error };
};