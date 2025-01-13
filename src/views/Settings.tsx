import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { storage } from '@/utils/storage';
import { modelProviders } from '@/Configs/ModelProviders';
import { Loader } from '@/components/Loader';
import { ModelConfig } from '@/types/settings';

export const Settings = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [providerConfigs, setProviderConfigs] = useState<Record<string, ModelConfig>>({});
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await storage.sync.get(['selectedProvider', 'providerConfigs']);
            const provider = settings.selectedProvider || 'Ollama';
            const configs = settings.providerConfigs || modelProviders;

            setSelectedProvider(provider);
            setProviderConfigs(configs);

            // If Ollama is selected, fetch models
            if (provider === 'Ollama' && configs[provider].model_selection) {
                await fetchModelsForProvider(configs[provider]);
            }

            setIsLoading(false);
        };
        loadSettings();
    }, []);

    // Fetch models when provider changes to Ollama
    useEffect(() => {
        if (selectedProvider === 'Ollama' && providerConfigs[selectedProvider]?.model_selection) {
            fetchModelsForProvider(providerConfigs[selectedProvider]);
        }
    }, [selectedProvider]);

    const fetchModelsForProvider = async (provider: ModelConfig) => {
        try {
            const response = await fetch(`${provider.url}/api/tags`);
            if (!response.ok) throw new Error('Failed to fetch models');

            const data = await response.json();
            const modelNames = data.models.map((model: { name: string }) => model.name);
            setAvailableModels(modelNames);
        } catch (error) {
            console.error('Error fetching models:', error);
            setAvailableModels([]);
        }
    };

    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        // Reset available models when switching to non-Ollama provider
        if (provider !== 'Ollama') {
            setAvailableModels([]);
        }
    };

    const handleConfigChange = (provider: string, field: keyof ModelConfig, value: string | number) => {
        setProviderConfigs(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        await storage.sync.set({
            selectedProvider,
            providerConfigs
        });
        alert('Settings saved successfully!');
    };

    if (isLoading) return <Loader />;

    const currentProvider = providerConfigs[selectedProvider];

    return (
        <div className="settings-content">
            <Link href="/">
                <button id="back-button" className="btn back-btn">← Back</button>
            </Link>
            <div className="settings-form">
                <div className="form-group">
                    <label>Provider:</label>
                    <select
                        value={selectedProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                    >
                        {Object.keys(modelProviders).map(provider => (
                            <option key={provider} value={provider}>
                                {provider}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Server URL:</label>
                    <input
                        type="text"
                        value={currentProvider.url}
                        onChange={(e) => handleConfigChange(selectedProvider, 'url', e.target.value)}
                    />
                </div>

                {currentProvider.api_key !== undefined && (
                    <div className="setting-group">
                        <label>API Key:</label>
                        <input
                            type="password"
                            value={currentProvider.api_key}
                            onChange={(e) => handleConfigChange(selectedProvider, 'api_key', e.target.value)}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Model:</label>
                    {currentProvider.model_selection ? (
                        <>
                            <select
                                value={currentProvider.model}
                                onChange={(e) => handleConfigChange(selectedProvider, 'model', e.target.value)}
                            >
                                <option value="">Select a model...</option>
                                {availableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                            <button
                                className="btn"
                                onClick={() => fetchModelsForProvider(currentProvider)}
                            >
                                Refresh Models
                            </button>
                        </>
                    ) : (
                        <input
                            type="text"
                            value={currentProvider.model}
                            readOnly
                        />
                    )}
                </div>

                {currentProvider.num_ctx !== undefined && (
                    <div className="form-group">
                        <label>Context Window:</label>
                        <input
                            type="number"
                            value={currentProvider.num_ctx}
                            onChange={(e) => handleConfigChange(selectedProvider, 'num_ctx', Number(e.target.value))}
                        />
                    </div>
                )}
            </div>

            <button onClick={handleSave} className="btn">
                Save Settings
            </button>
        </div>
    );
};