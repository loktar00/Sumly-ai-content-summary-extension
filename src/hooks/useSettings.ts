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

    // Load saved settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { providerSettings = {}, selectedProvider: savedProvider = 'Ollama' } =
                    await storage.sync.get(['providerSettings', 'selectedProvider']);

                setSavedSettings(providerSettings);
                setSelectedProvider(savedProvider);

                // Set initial settings based on selected provider
                const mergedSettings = {
                    ...modelProviders[savedProvider as keyof typeof modelProviders],
                    ...providerSettings[savedProvider]
                };
                setSettings(mergedSettings);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Update settings when provider changes
    useEffect(() => {
        const mergedSettings = {
            ...modelProviders[selectedProvider as keyof typeof modelProviders],
            ...savedSettings[selectedProvider]
        };
        setSettings(mergedSettings);
    }, [selectedProvider, savedSettings]);

    const getProviderSettings = (provider: string): ModelConfig => {
        if (!(provider in modelProviders)) {
            throw new Error(`Invalid provider: ${provider}`);
        }
        return {
            ...modelProviders[provider as keyof typeof modelProviders],
            ...savedSettings[provider]
        };
    };

    const saveSettings = async (provider: string, config: Partial<ModelConfig>) => {
        const newSavedSettings = {
            ...savedSettings,
            [provider]: {
                ...savedSettings[provider],
                ...config
            }
        };

        await storage.sync.set({
            selectedProvider: provider,
            providerSettings: newSavedSettings
        });

        setSavedSettings(newSavedSettings);

        if (provider === selectedProvider) {
            setSettings({
                ...modelProviders[provider as keyof typeof modelProviders],
                ...newSavedSettings[provider]
            });
        }
    };

    return {
        settings,
        isLoading,
        error,
        saveSettings,
        getProviderSettings,
        selectedProvider,
        setSelectedProvider
    };
};