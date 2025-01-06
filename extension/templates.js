import { ui } from './ui.js';
import { api } from './api.js';
import { utils } from './utils.js';
import { promptManager } from './prompt-manager.js';
import { handlers } from './handlers.js';
import { state } from './state.js';
import { markdownToHtml } from './markdown.js';
import { chat } from './chat.js';

export const templates = {
    mainView: `
        <div class="prompt-selector">
            <select id="prompt-selector">
                <option value="default">Default System Prompt</option>
            </select>
        </div>
        <textarea id="system-prompt" rows="6" cols="50" placeholder="System Prompt"></textarea>
        <div class="summarize-controls">
            <button id="summarize-transcript" class="btn ai-btn">Summarize Page with AI</button>
            <div class="chunk-control">
                <label>
                    <input type="checkbox" id="enable-chunking" checked>
                    <span>Auto-chunk large content</span>
                </label>
            </div>
        </div>
        <textarea id="transcript-area" rows="5" cols="50" placeholder="Content will appear here..."></textarea>
        <div class="button-group source-buttons">
            <button id="fetch-webpage" class="btn">Get Page Content</button>
            <button id="fetch-current-transcript" class="btn">Get Transcript</button>
            <button id="copy-to-clipboard" class="btn">Copy to Clipboard</button>
        </div>
    `,
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
                        <textarea id="chat-input" rows="3" placeholder="Ask a question about the content..."></textarea>
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
            <button id="back-button" class="btn back-btn">← Back</button>
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
            <button id="back-button" class="btn back-btn">← Back</button>
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
    `
};

// Template initializers object to hold setup functions for each template
const templateInitializers = {
    mainView: () => {
        const openOptions = document.getElementById("open-options");
        const managePrompts = document.getElementById("manage-prompts");
        const fetchTranscript = document.getElementById("fetch-current-transcript");
        const fetchWebpage = document.getElementById("fetch-webpage");
        const copyClipboard = document.getElementById("copy-to-clipboard");
        const summarize = document.getElementById("summarize-transcript");
        const promptSelector = document.getElementById("prompt-selector");
        const systemPrompt = document.getElementById("system-prompt");

        // Main button handlers
        openOptions?.addEventListener("click", () => renderTemplateAndInitialize('settings', {}));
        managePrompts?.addEventListener("click", handlers.handleManagePrompts);
        fetchTranscript?.addEventListener("click", handlers.handleFetchTranscript);
        fetchWebpage?.addEventListener("click", handlers.handleFetchWebpage);
        copyClipboard?.addEventListener("click", handlers.handleCopyToClipboard);
        summarize?.addEventListener("click", handlers.handleSummarize);

        // Prompt selector handler - only updates textarea content
        if (promptSelector && systemPrompt) {
            promptSelector.addEventListener('change', async () => {
                const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');
                const defaultPrompt = await api.getSystemPrompt();

                const selectedPattern = promptSelector.value;
                systemPrompt.value = selectedPattern === 'default'
                    ? defaultPrompt
                    : savedPrompts[selectedPattern].content;
            });
        }

        // Load initial prompts and system prompt
        ui.loadSystemPrompt();
        ui.loadPromptSelector();
    },

    settings: async () => {
        // Initialize settings
        const aiUrl = document.getElementById('ai-url');
        const aiModel = document.getElementById('ai-model');
        const numCtx = document.getElementById('num-ctx');
        const fetchModels = document.getElementById('fetch-models');
        const saveSettings = document.getElementById('save-settings');
        const backBtn = document.getElementById('back-button');

        // Load current settings
        const savedSettings = await api.getAiSettings();
        aiUrl.value = savedSettings.url;
        numCtx.value = savedSettings.numCtx;

        backBtn.addEventListener('click', () => {
            renderTemplateAndInitialize('mainView', {});
        });

        // Fetch models handler
        fetchModels.addEventListener('click', async () => {
            try {
                aiModel.disabled = true;
                aiModel.innerHTML = '<option value="">Loading...</option>';

                const response = await fetch(`${aiUrl.value}/api/tags`);
                if (!response.ok) throw new Error('Failed to fetch models');

                const data = await response.json();
                const models = data.models || [];

                aiModel.innerHTML = models
                    .map(model => `<option value="${model.name}">
                        ${model.name} (${utils.formatSize(model.size)})
                    </option>`)
                    .join('');

                aiModel.value = savedSettings.model;
                aiModel.disabled = false;
            } catch (error) {
                alert(`Error fetching models: ${error.message}`);
                aiModel.innerHTML = '<option value="">Error loading models</option>';
            }
        });

        // Save settings handler
        saveSettings.addEventListener('click', async () => {
            try {
                await chrome.storage.sync.set({
                    aiUrl: aiUrl.value,
                    aiModel: aiModel.value,
                    numCtx: parseInt(numCtx.value)
                });
                alert('Settings saved successfully!');
            } catch (error) {
                alert(`Error saving settings: ${error.message}`);
            }
        });

        // Initial model fetch
        fetchModels.click();
    },

    promptManager: () => {
        const saveBtn = document.getElementById('save-prompt');
        const useCurrentUrlBtn = document.getElementById('use-current-url');
        const patternInput = document.getElementById('prompt-pattern');
        const promptContent = document.getElementById('prompt-content');
        const promptsList = document.getElementById('prompts-list');
        const backBtn = document.getElementById('back-button');

        backBtn.addEventListener('click', () => {
            renderTemplateAndInitialize('mainView', {});
        });

        useCurrentUrlBtn?.addEventListener('click', async () => {
            const url = await utils.getCurrentUrl();
            patternInput.value = url;
        });

        saveBtn?.addEventListener('click', async () => {
            const pattern = patternInput.value.trim();
            const content = promptContent.value.trim();

            if (!pattern || !content) {
                return;
            }

            await promptManager.savePrompt(pattern, content);
            await promptManager.loadPrompts();

            patternInput.value = '';
            promptContent.value = '';
        });

        promptsList?.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const pattern = e.target.dataset.pattern;

            if (!action || !pattern) {
                return;
            }

            // Get the current saved prompts
            const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

            switch (action) {
            case 'edit':
                patternInput.value = pattern;
                promptContent.value = savedPrompts[pattern].content;
                break;

            case 'delete':
                delete savedPrompts[pattern];
                await chrome.storage.sync.set({ savedPrompts });
                await promptManager.loadPrompts();
                break;

            case 'default':
                // Update the prompt to be default
                await promptManager.savePrompt(
                    pattern,
                    savedPrompts[pattern].content,
                    true
                );
                await promptManager.loadPrompts();
                break;
            }
        });

        promptManager.loadPrompts();
    },

    summary: async (data) => {
        const { pageTitle, processedContent, systemPrompt, aiSettings } = data;
        try {
            const container = document.querySelector('#panel-content');

            // Initialize conversation history with processed content
            state.conversationHistory = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${pageTitle}\n\n${processedContent}` }
            ];

            // Render the summary template
            container.innerHTML = renderTemplate('summary', {
                title: pageTitle,
                model: aiSettings.model,
                transcript: `${pageTitle}\n\n${processedContent}`
            });

            // Update initial token count with full content
            ui.updateTokenCount(container);

            // Get references to elements after template is rendered
            const elements = {
                chatContainer: container.querySelector('#chat-container'),
                formattedSummary: container.querySelector('#formatted-summary'),
                chatLoading: container.querySelector('#chat-loading'),
                chatInput: container.querySelector('#chat-input'),
                sendButton: container.querySelector('#send-message'),
                backButton: container.querySelector('#back-to-transcript')
            };

            if (!elements.chatContainer || !elements.formattedSummary || !elements.chatLoading) {
                console.error('Required elements not found after template render');
                return;
            }

            elements.backButton.addEventListener('click', () => location.reload());

            // Add transcript as first message
            elements.formattedSummary.innerHTML = `
                <div class="message user-message">
                    <div>
                        ${markdownToHtml(`${systemPrompt}\n\n${processedContent}`)}
                    </div>
                </div>
            `;

            ui.autoScroll(true);

            try {
                ui.toggleChatElements(true);

                const response = await chat.handleStreamingAIResponse(
                    aiSettings,
                    processedContent,
                    elements.formattedSummary
                );

                state.conversationHistory.push(
                    { role: 'user', content: processedContent },
                    { role: 'assistant', content: response }
                );

                ui.toggleChatElements(false);

                if (elements.chatInput && elements.sendButton) {
                    handlers.setupStreamingChatHandlers(
                        elements.formattedSummary,
                        elements.chatInput,
                        elements.sendButton,
                        aiSettings
                    );
                }
            } catch (error) {
                elements.chatLoading.innerHTML = `
                    <div class="error-text">
                        Error generating summary: ${error.message}
                    </div>
                `;
                ui.toggleChatElements(false);
                ui.autoScroll(true);
            }
        } catch (error) {
            console.error('Error in handleSummarize:', error);
            alert(`Failed to generate summary: ${error.message}`);
        }
    }
};

export const renderTemplate = (templateName, data = {}) => {
    let template = templates[templateName];

    // Handle regular replacements
    Object.keys(data).forEach(key => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    // Create a temporary container for the template
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = template;

    return tempContainer.innerHTML;
};

// Update renderTemplate to include initialization
export function renderTemplateAndInitialize(templateName, data = {}) {
    const container = document.querySelector('#panel-content');

    if (!container) {
        console.error('Container not found');
        return;
    }

    let template = templates[templateName];

    // Handle regular replacements
    Object.keys(data).forEach(key => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });

    // Create a temporary container for the template
    container.innerHTML = template;

    // Initialize the template if an initializer exists
    if (templateInitializers[templateName]) {
        templateInitializers[templateName](data);
    }
}