const templates = {
    summary: `
        <div class="summary-content">
            <div class="model-label">
                <span class="glow text">Model: {{model}}</span>
            </div>
            <div class="main-content">
                <div id="chat-container" class="chat-container" role="log" aria-live="polite">
                    <div id="chat-messages" class="chat-messages">
                        <div id="formatted-summary" class="markdown-body"></div>
                    </div>
                    <div id="chat-loading" class="chat-loading hidden">
                        <div class="neon-loader">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div class="token-display"></div>
                        <div class="button-group loading-controls">
                            <button id="cancel-generation" class="btn">← Back</button>
                            <button id="stop-generation" class="btn danger-btn">Stop</button>
                        </div>
                    </div>
                    <div class="chat-input-container hidden">
                        <textarea id="chat-input" rows="3" placeholder="Ask a question about the transcript..."></textarea>
                        <div class="token-display"></div>
                        <div class="button-group">
                            <button id="back-to-transcript" class="btn">← Back</button>
                            <button id="send-message" class="btn">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    promptManager: `
        <div class="prompt-manager">
            <div class="prompt-form">
                <div class="prompt-url-input">
                    <input type="text" id="prompt-pattern" placeholder="URL pattern (e.g., reddit.com/user)">
                    <button id="use-current-url" class="btn">Get URL</button>
                </div>
                <textarea id="prompt-content" rows="6" placeholder="Enter prompt for this URL pattern"></textarea>
                <button id="save-prompt" class="btn">Save</button>
            </div>
            <div class="saved-prompts">
                <h3>Saved Prompts</h3>
                <div id="prompts-list"></div>
            </div>
        </div>
    `,
    promptItem: `
        <div class="prompt-item">
            <div class="prompt-pattern" title="{{pattern}}">{{pattern}}</div>
            <div class="prompt-content">{{promptContent}}</div>
            <div class="prompt-actions">
                <button class="btn" data-action="edit" data-pattern="{{pattern}}">Edit</button>
                <button class="btn danger-btn" data-action="delete" data-pattern="{{pattern}}">Delete</button>
                <button class="btn default-btn{{defaultClass}}" data-action="default" data-pattern="{{pattern}}">
                    {{defaultText}}
                </button>
            </div>
        </div>
    `,
    settings: `
        <div class="settings-content">
            <div class="settings-form">
                <div class="form-group">
                    <label for="ai-url">Ollama Server URL:</label>
                    <input type="text" id="ai-url" placeholder="http://localhost:11434">
                </div>

                <div class="form-group">
                    <label for="ai-model">AI Model:</label>
                    <select id="ai-model" disabled>
                        <option value="">Loading models...</option>
                    </select>
                    <button id="fetch-models" class="btn">Fetch Available Models</button>
                </div>

                <div class="form-group">
                    <label for="num-ctx">Context Window Size:</label>
                    <input type="number" id="num-ctx" min="1024" step="512" value="4096">
                    <div class="help-text">Larger values allow for longer conversations but use more memory</div>
                </div>

                <div class="button-group">
                    <button id="save-settings" class="btn">Save Settings</button>
                </div>
            </div>
        </div>
    `,
    mainView: `
        <div class="prompt-selector">
            <select id="prompt-selector">
                <option value="default">Default System Prompt</option>
            </select>
        </div>
        <textarea id="system-prompt" rows="6" cols="50" placeholder="System Prompt"></textarea>
        <button id="summarize-transcript" class="btn ai-btn">Summarize Page with AI</button>
        <textarea id="transcript-area" rows="5" cols="50" placeholder="Content will appear here..."></textarea>
        <div class="button-group source-buttons">
            <button id="fetch-webpage" class="btn">Get Page Content</button>
            <button id="fetch-current-transcript" class="btn">Get Transcript</button>
            <button id="copy-to-clipboard" class="btn">Copy to Clipboard</button>
        </div>
    `
};

// Template rendering function
function renderTemplate(templateName, data = {}) {
    let template = templates[templateName];

    // Handle regular replacements
    Object.keys(data).forEach(key => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    return template;
}