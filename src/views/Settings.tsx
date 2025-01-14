import { useState } from 'react';
import { Link } from 'wouter';
import { ModelConfig, modelProviders } from '@/Configs/ModelProviders';
import { Loader } from '@/components/Loader';
import { useSettings } from '@/hooks/useSettings';

export const Settings = () => {
    const {
        settings,
        isLoading: settingsLoading,
        error: settingsError,
        saveSettings,
        getProviderSettings,
        selectedProvider,
        setSelectedProvider
    } = useSettings();

    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider);
        if (provider === 'Ollama') {
            const providerSettings = getProviderSettings(provider);
            if (providerSettings.model_selection) {
                fetchModelsForProvider(providerSettings);
            }
        } else {
            setAvailableModels([]);
        }
    };

    const handleConfigChange = (field: keyof ModelConfig, value: string | number) => {
        if (!settings) return;

        saveSettings(selectedProvider, {
            ...settings,
            [field]: value
        });
    };

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

    const handleSave = async () => {
        const currentConfig = getProviderSettings(selectedProvider);
        await saveSettings(selectedProvider, currentConfig);
        alert('Settings saved successfully!');
    };

    if (settingsLoading) {
        return <Loader />;
    }
    if (settingsError) {
        return <div className="error-text">{settingsError}</div>;
    }

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
                        value={settings?.url}
                        onChange={(e) => handleConfigChange('url', e.target.value)}
                    />
                </div>

                {settings?.api_key !== undefined && (
                    <div className="form-group">
                        <label>API Key:</label>
                        <input
                            type="password"
                            value={settings?.api_key}
                            onChange={(e) => handleConfigChange('api_key', e.target.value)}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Model:</label>
                    {settings?.model_selection ? (
                        <>
                            <select
                                value={settings?.model}
                                onChange={(e) => handleConfigChange('model', e.target.value)}
                            >
                                <option value="">Select a model...</option>
                                {availableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                            <button
                                className="btn"
                                onClick={() => fetchModelsForProvider(getProviderSettings(selectedProvider))}
                            >
                                Refresh Models
                            </button>
                        </>
                    ) : (
                        <input
                            type="text"
                            value={settings?.model}
                            readOnly
                        />
                    )}
                </div>

                {settings?.temperature !== undefined && (
                    <div className="form-group">
                        <label>Temperature:</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={settings?.temperature}
                            onChange={(e) => handleConfigChange('temperature', Number(e.target.value))}
                        />
                    </div>
                )}

                {settings?.num_ctx !== undefined && (
                    <div className="form-group">
                        <label>Context Window:</label>
                        <input
                            type="number"
                            value={settings?.num_ctx}
                            onChange={(e) => handleConfigChange('num_ctx', Number(e.target.value))}
                        />
                    </div>
                )}

                {settings?.max_tokens !== undefined && (
                    <div className="form-group">
                        <label>Max Return Tokens:</label>
                        <input
                            type="number"
                            value={settings?.max_tokens}
                            min={1}
                            max={8000}
                            onChange={(e) => handleConfigChange('max_tokens', Number(e.target.value))}
                        />
                    </div>
                )}
            </div>
            <div className="form-group--center">
                <button onClick={handleSave} className="btn ai-btn">
                    Save Settings
                </button>
            </div>
        </div>
    );
};