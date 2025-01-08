import { useState, useEffect } from 'react';
import { api } from '@/api/api';
import { storage } from '@/utils/storage';
import { CONSTANTS } from '@/constants';

export const Settings = () => {
    const [aiUrl, setAiUrl] = useState('');
    const [aiModel, setAiModel] = useState('');
    const [numCtx, setNumCtx] = useState(CONSTANTS.API.DEFAULT_NUM_CTX);
    const [models, setModels] = useState<Array<{ name: string; size: number }>>([]);

    useEffect(() => {
        const initializeSettings = async () => {
            const settings = await api.getAiSettings();
            setAiUrl(settings.url as string);
            setNumCtx(settings.numCtx as number);

            try {
                const response = await fetch(`${settings.url}/api/tags`);
                if (!response.ok) throw new Error('Failed to fetch models');

                const data = await response.json();
                const availableModels = data.models || [];
                setModels(availableModels);

                // Set the model after we have the list
                setAiModel(settings.model as string);
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        };

        initializeSettings();
    }, []);

    const handleFetchModels = async () => {
        try {
            const response = await fetch(`${aiUrl}/api/tags`);
            if (!response.ok) throw new Error('Failed to fetch models');

            const data = await response.json();
            const availableModels = data.models || [];
            setModels(availableModels);
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const handleSave = async () => {
        await storage.set({
            aiUrl,
            aiModel,
            numCtx: parseInt(numCtx.toString())
        });
        alert('Settings saved successfully!');
    };

    return (
        <div className="settings-content">
            <button id="back-button" className="btn back-btn">← Back</button>
            <div className="settings-form">
                <div className="form-group">
                    <label htmlFor="ai-url">Ollama Server URL:</label>
                    <input
                        type="text"
                        id="ai-url"
                        value={aiUrl}
                        onChange={(e) => setAiUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="ai-model">AI Model:</label>
                    <select
                        id="ai-model"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                    >
                        {models.map(model => (
                            <option key={model.name} value={model.name}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleFetchModels} className="btn">
                        Fetch Available Models
                    </button>
                </div>

                <div className="form-group">
                    <label htmlFor="num-ctx">Context Window Size:</label>
                    <input
                        type="number"
                        id="num-ctx"
                        value={numCtx}
                        onChange={(e) => setNumCtx(parseInt(e.target.value))}
                        min="1024"
                        step="512"
                    />
                    <div className="help-text">
                        Larger values allow for longer conversations but use more memory
                    </div>
                </div>

                <div className="button-group">
                    <button onClick={handleSave} className="btn">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};