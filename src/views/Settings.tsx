import { Link } from "wouter";

export const Settings = () => (
    <div className="settings-content">
        <Link to="/">
            <button id="back-button" className="btn back-btn">← Back</button>
        </Link>
        <div className="settings-form">
            <div className="form-group">
                    <label htmlFor="ai-url">Ollama Server URL:</label>
                    <input type="text" id="ai-url" placeholder="http://localhost:11434" />
                </div>

                <div className="form-group">
                    <label htmlFor="ai-model">AI Model:</label>
                    <select id="ai-model" disabled>
                        <option value="">Loading models...</option>
                    </select>
                    <button id="fetch-models" className="btn">Fetch Available Models</button>
                </div>

                <div className="form-group">
                    <label htmlFor="num-ctx">Context Window Size:</label>
                    <input type="number" id="num-ctx" min="1024" step="512" value="4096" />
                    <div className="help-text">Larger values allow for longer conversations but use more memory</div>
                </div>

                <div className="button-group">
                <button id="save-settings" className="btn">Save Settings</button>
            </div>
        </div>
    </div>
);