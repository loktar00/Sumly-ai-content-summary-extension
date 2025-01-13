import { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';
import { ModelConfig, modelProviders } from '@/Configs/ModelProviders';

interface UseSettingsReturn {
    settings: ModelConfig | null;
    isLoading: boolean;
    error: string | null;
    saveSettings: (provider: string, config: Partial<ModelConfig>) => Promise<void>;
    getProviderSettings: (provider: string) => ModelConfig;
    selectedProvider: string;
    setSelectedProvider: (provider: string) => void;
}

export const useSettings = (): UseSettingsReturn => {
    const [settings, setSettings] = useState<ModelConfig | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<string>('Ollama');
    const [savedSettings, setSavedSettings] = useState<Record<string, Partial<ModelConfig>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    // Load saved settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { providerSettings = {}, selectedProvider: savedProvider = 'Ollama' } =
                    await storage.sync.get(['providerSettings', 'selectedProvider']);

                setSavedSettings(providerSettings);
                setSelectedProvider(savedProvider);
                setInitialized(true);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const getProviderSettings = (provider: string): ModelConfig => {
        if (!(provider in modelProviders)) {
            throw new Error(`Invalid provider: ${provider}`);
        }

        // Only use saved settings after initialization
        const currentSavedSettings = initialized ? savedSettings[provider] || {} : {};

        const mergedSettings = {
            ...modelProviders[provider as keyof typeof modelProviders],
            ...currentSavedSettings,
            provider
        };

        return mergedSettings;
    };

    // Update settings whenever savedSettings changes
    useEffect(() => {
        if (!initialized || !selectedProvider) return;

        const mergedSettings = getProviderSettings(selectedProvider);
        setSettings(mergedSettings);
    }, [selectedProvider, savedSettings, initialized]);

    const saveSettings = async (provider: string, config: Partial<ModelConfig>) => {
        const newSavedSettings = {
            ...savedSettings,
            [provider]: {
                ...savedSettings[provider],
                ...config,
                provider
            }
        };

        await storage.sync.set({
            selectedProvider: provider,
            providerSettings: newSavedSettings
        });

        setSavedSettings(newSavedSettings);
    };

    return {
        settings,
        isLoading: isLoading || !initialized,
        error,
        saveSettings,
        getProviderSettings,
        selectedProvider,
        setSelectedProvider
    };
};