const state = {
    conversationHistory: []
};

// Utility functions
const utils = {

    async getCurrentUrl() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tabs[0]?.url) {
            return null;
        }

        return tabs[0].url;
    },

    async getCurrentVideoId() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.url) return null;
        return new URL(tabs[0].url).searchParams.get("v");
    },

    async getVideoTitle(videoId) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            return tabs[0]?.title?.replace(' - YouTube', '') || `Video ${videoId}`;
        } catch {
            return `Video ${videoId}`;
        }
    },

    parseTranscriptXml(transcriptXml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");

        // Create a textarea element for decoding HTML entities
        const decoder = document.createElement('textarea');

        return Array.from(xmlDoc.getElementsByTagName('text'))
            .map(node => ({
                text: node.textContent
                    .trim()
                    // Decode HTML entities
                    .replace(/&([^;]+);/g, (match) => {
                        decoder.innerHTML = match;
                        return decoder.value;
                    })
                    // Replace multiple spaces with single space
                    .replace(/\s+/g, ' ')
                    // Remove any remaining newlines
                    .replace(/\n/g, ' '),
                start: parseFloat(node.getAttribute('start')),
                duration: parseFloat(node.getAttribute('dur') || '0')
            }))
            .filter(line => line.text.length > 0)
            .map(line => line.text)
            // Join with single space instead of newline
            .join(' ');
    },

    async fetchYouTubeTranscript(videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
                headers: {
                    'Accept-Language': 'en-US',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const html = await response.text();
            const splitHtml = html.split('"captions":');

            if (splitHtml.length <= 1) {
                throw new Error('No captions found in video');
            }

            const captionsJson = JSON.parse(
                splitHtml[1].split(',"videoDetails')[0].replace(/\n/g, '')
            );

            const captionTracks = captionsJson?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!captionTracks?.length) {
                throw new Error('No caption tracks found');
            }

            const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
            const transcriptResponse = await fetch(track.baseUrl);
            const transcriptXml = await transcriptResponse.text();

            return this.parseTranscriptXml(transcriptXml);
        } catch (error) {
            console.error('Error fetching transcript:', error);
            throw new Error(`Failed to fetch transcript: ${error.message}`);
        }
    },

    async getPageContent() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
            throw new Error('No active tab found');
        }

        // Inject and execute content script
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Create a clone of the document
                const virtualDoc = document.cloneNode(true);
                const virtualBody = virtualDoc.querySelector('body');

                if (!virtualBody) {
                    return document.body.innerText;
                }

                // Remove unwanted elements from the clone
                const elementsToRemove = virtualBody.querySelectorAll(
                    'script, style, noscript, img, svg, video, audio, nav, footer, header, aside'
                );
                elementsToRemove.forEach(el => el.remove());

                let innerText = '';

                const main = virtualBody.querySelector('main');
                if (main) {
                    innerText += main.innerText;
                }

                innerText += virtualBody.innerText;

                // Clean up multiple line breaks
                return innerText
                    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace 3+ line breaks with 2
                    .replace(/\s+/g, ' ')               // Replace multiple spaces with single space
                    .replace(/\n +/g, '\n')             // Remove spaces at start of lines
                    .replace(/ +\n/g, '\n')             // Remove spaces at end of lines
                    .trim();                            // Remove leading/trailing whitespace
            }
        });

        return result;
    },

    estimateTokens(text) {
        if (!text) return 0;

        // Count words (splitting on whitespace and punctuation)
        const words = text.trim().split(/[\s,.!?;:'"()[\]{}|\\/<>]+/).filter(Boolean);

        // Count numbers (including decimals)
        const numbers = text.match(/\d+\.?\d*/g) || [];

        // Count special tokens (common in code and URLs)
        const specialTokens = text.match(/[+\-*/=_@#$%^&]+/g) || [];

        // Base calculation:
        // - Most words are 1-2 tokens
        // - Numbers are usually 1 token each
        // - Special characters often get their own token
        // - Add 10% for potential underestimation
        const estimate = Math.ceil(
            (words.length * 1.3) +          // Average 1.3 tokens per word
            (numbers.length) +              // Count numbers
            (specialTokens.length) +        // Count special tokens
            (text.length / 100)            // Add small factor for length
        );

        return Math.max(1, estimate);
    },

    calculateConversationTokens(history) {
        // Add extra tokens for message formatting and role indicators
        const formatTokens = history.length * 4; // ~4 tokens per message for format

        // Sum up tokens from all messages
        const contentTokens = history.reduce((total, message) => {
            return total + this.estimateTokens(message.content);
        }, 0);

        return formatTokens + contentTokens;
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    },

    async chunkAndSummarize(content, contextSize, aiSettings, systemPrompt) {
        // Calculate available tokens accounting for:
        // 1. System prompt tokens
        // 2. Message formatting tokens (~4 per message)
        // 3. Safety margin for potential underestimation (50 tokens)
        const systemPromptTokens = utils.estimateTokens(systemPrompt);
        const messageFormatTokens = 8;  // 4 tokens each for system and user message
        const safetyMargin = 50;

        const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;
        const availableTokens = contextSize - totalOverhead;
        const estimatedTokens = utils.estimateTokens(content);

        // If content fits in context, return as is
        if (estimatedTokens <= availableTokens) {
            return content;
        }

        const chunkSummaryPrompt = CONSTANTS.API.DEFAULT_CHUNK_SUMMARY_PROMPT;

        // Calculate optimal chunk size (leaving room for summary prompt)
        const summaryPromptTokens = utils.estimateTokens(chunkSummaryPrompt);
        const chunkSize = Math.floor((availableTokens - summaryPromptTokens) * 0.9);  // 90% of available space

        // Split content into chunks
        const chunks = [];
        let currentChunk = '';
        let currentTokens = 0;

        const sentences = content.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
            const sentenceTokens = utils.estimateTokens(sentence);

            if (currentTokens + sentenceTokens > chunkSize) {
                chunks.push(currentChunk);
                currentChunk = sentence;
                currentTokens = sentenceTokens;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
                currentTokens += sentenceTokens;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        // Switch to summary view to show progress
        const container = document.querySelector('#panel-content');
        container.innerHTML = renderTemplate('summary', {
            model: aiSettings.model
        });

        const formattedSummary = document.getElementById('formatted-summary');
        const loadingElement = document.getElementById('chat-loading');

        // Show initial status
        formattedSummary.innerHTML = `
            <div class="message system-message">
                <div>Content size (${estimatedTokens} tokens) exceeds context window (${contextSize} tokens).</div>
                <div>Breaking content into ${chunks.length} chunks for processing...</div>
            </div>
        `;

        // Show loading state
        loadingElement.classList.remove('hidden');

        // Summarize each chunk
        const chunkSummaries = [];
        let processedChunks = 0;

        for (const chunk of chunks) {
            // Update progress
            const progressMessage = document.createElement('div');
            progressMessage.className = 'message system-message';
            progressMessage.innerHTML = `Processing chunk ${processedChunks + 1} of ${chunks.length}...`;

            ui.autoScroll(true);

            formattedSummary.appendChild(progressMessage);

            const summary = await chat.handleStreamingAIResponse(
                aiSettings,
                chunk,
                formattedSummary,  // Now showing intermediate summaries
                chunkSummaryPrompt
            );

            chunkSummaries.push(summary);
            processedChunks++;
        }

        // After processing all chunks
        const combinedSummaries = chunkSummaries.join('\n\n');

        // Add final status message
        const finalMessage = document.createElement('div');
        finalMessage.className = 'message system-message';
        finalMessage.innerHTML = 'Performing final summarization...';
        formattedSummary.appendChild(finalMessage);
        ui.autoScroll(true);

        return combinedSummaries;
    }
};

// API interactions
const api = {
    async getApiUrl() {
        const { apiUrl } = await chrome.storage.sync.get("apiUrl");
        return apiUrl || CONSTANTS.API.DEFAULT_API_URL;
    },

    async getAiSettings() {
        const { aiUrl, aiModel, numCtx } = await chrome.storage.sync.get([
            "aiUrl",
            "aiModel",
            "numCtx"
        ]);

        return {
            url: `${aiUrl || CONSTANTS.API.DEFAULT_AI_URL}`,
            model: aiModel || CONSTANTS.API.DEFAULT_AI_MODEL,
            numCtx: numCtx || CONSTANTS.API.DEFAULT_NUM_CTX
        };
    },

    async getSystemPrompt() {
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');
        const defaultPrompt = Object.entries(savedPrompts)
            .find(([, prompt]) => prompt.isDefault);

        return defaultPrompt ? defaultPrompt[1].content : CONSTANTS.API.DEFAULT_SYSTEM_PROMPT;
    }
};

const chat = {
    async handleStreamingAIResponse(aiSettings, prompt, parentElement, systemPromptOverride = null) {
        try {
            const baseUrl = aiSettings.url;
            const endpoint = `${baseUrl}/api/chat`;
            let abortController = new AbortController();

            // Setup stop and cancel handlers
            const stopBtn = document.getElementById('stop-generation');
            const cancelBtn = document.getElementById('cancel-generation');

            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    abortController.abort();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    abortController.abort();
                    location.reload();
                });
            }

            const messages = systemPromptOverride
                ? [
                    { role: 'system', content: systemPromptOverride },
                    { role: 'user', content: prompt }
                ]
                : [
                    ...state.conversationHistory,
                    { role: 'user', content: prompt }
                ];

            const requestBody = {
                model: aiSettings.model,
                messages: messages,
                options: {
                    temperature: 0.8,
                    num_ctx: aiSettings.numCtx,
                },
                stream: true
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
            }

            const reader = response.body.getReader();
            let accumulatedResponse = '';
            let messageElement = null;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        try {
                            const data = JSON.parse(line);
                            if (data.message?.content) {
                                if (!messageElement) {
                                    messageElement = document.createElement('div');
                                    messageElement.className = 'message assistant-message';
                                    parentElement.appendChild(messageElement);
                                }

                                accumulatedResponse += data.message.content;
                                messageElement.innerHTML = markdownToHtml(accumulatedResponse);
                                ui.autoScroll();
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    if (messageElement) {
                        messageElement.innerHTML += '<p><em>Generation stopped by user.</em></p>';
                    }

                    return accumulatedResponse;
                }
                throw error;
            }

            return accumulatedResponse;
        } catch (error) {
            console.error('Error in handleStreamingAIResponse:', error);
            throw error;
        }
    }
};

// Add to the UI utilities section
const ui = {
    toggleChatElements(loading = false) {
        const chatInputContainer = document.querySelector('.chat-input-container');
        const chatLoading = document.querySelector('#chat-loading');
        const loadingControls = document.querySelector('.loading-controls');

        if (loading) {
            chatInputContainer.classList.add('hidden');
            chatLoading.classList.remove('hidden');
            if (loadingControls) {
                loadingControls.classList.remove('hidden');
            }
        } else {
            chatInputContainer.classList.remove('hidden');
            chatLoading.classList.add('hidden');

            if (loadingControls) {
                loadingControls.classList.add('hidden');
            }
        }
    },

    autoScroll(force = false) {
        const element = document.getElementById("chat-messages");
        const isUserScrolledUp = element.scrollHeight - element.clientHeight - element.scrollTop > CONSTANTS.UI.SCROLL_TOLERANCE;

        if (!isUserScrolledUp || force) {
            element.scrollTop = element.scrollHeight;
        }
    },

    async loadSystemPrompt() {
        const systemPromptArea = document.getElementById('system-prompt');
        if (systemPromptArea) {
            const systemPrompt = await api.getSystemPrompt();
            systemPromptArea.value = systemPrompt;

            // Add event listener to save changes
            systemPromptArea.addEventListener('change', async () => {
                await chrome.storage.sync.set({
                    systemPrompt: systemPromptArea.value
                });
            });
        }
    },

    async loadPromptSelector() {
        const selector = document.getElementById('prompt-selector');
        const systemPromptArea = document.getElementById('system-prompt');

        if (!selector || !systemPromptArea) {
            return;
        }

        // Get current URL
        const currentUrl = await utils.getCurrentUrl();
        if (!currentUrl) {
            return;
        }

        // Get all saved prompts
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

        // Clear existing options
        selector.innerHTML = '<option value="default">Default System Prompt</option>';

        // Add saved prompts as options, excluding the current default
        Object.entries(savedPrompts)
            .filter(([, promptData]) => !promptData.isDefault) // Filter out the default prompt
            .forEach(([pattern, ]) => {
                const option = document.createElement('option');
                option.value = pattern;
                option.textContent = pattern;
                selector.appendChild(option);
            });

        // Find best matching pattern and select it in dropdown
        const bestMatch = promptManager.findBestMatchForUrl(
            currentUrl,
            Object.keys(savedPrompts)
        );

        if (bestMatch) {
            selector.value = bestMatch;
            systemPromptArea.value = savedPrompts[bestMatch].content;
        } else {
            selector.value = 'default';
            systemPromptArea.value = await api.getSystemPrompt();
        }
    },

    updateTokenCount(container) {
        const tokenDisplay = container.querySelectorAll('.token-display');
        if (!tokenDisplay) {
            return;
        }

        const totalTokens = utils.calculateConversationTokens(state.conversationHistory);
        tokenDisplay.forEach(display => {
            display.textContent = `Total Tokens: ${totalTokens.toLocaleString()} / Context ${state.contextSize.toLocaleString()}`;
        });

        // Add warning class if approaching limit
        tokenDisplay.forEach(display => {
            display.classList.toggle('token-warning',
                totalTokens > state.contextSize * 0.8);
        });
    }
};

// Event handlers
const handlers = {
    async handleFetchWebpage() {
        const transcriptArea = document.getElementById("transcript-area");

        try {
            transcriptArea.value = "Fetching page content...";
            const content = await utils.getPageContent();
            transcriptArea.value = content.trim();
        } catch (error) {
            transcriptArea.value = `Error fetching page content: ${error.message}`;
        }
    },

    async handleFetchTranscript() {
        const videoId = await utils.getCurrentVideoId();
        const transcriptArea = document.getElementById("transcript-area");

        if (!videoId) {
            alert("Could not determine video ID. Please ensure you're on a YouTube video page.");
            return;
        }

        transcriptArea.value = "Fetching transcript...";
        try {
            const transcript = await utils.fetchYouTubeTranscript(videoId);
            transcriptArea.value = transcript;
        } catch (error) {
            transcriptArea.value = `Error fetching transcript: ${error.message}`;
        }
    },

    async handleSummarize() {
        try {
            const transcriptArea = document.getElementById("transcript-area");
            const systemPromptArea = document.getElementById("system-prompt");
            const enableChunking = document.getElementById("enable-chunking");
            let transcript = transcriptArea.value.trim();

            // Check if we're on YouTube
            const currentUrl = await utils.getCurrentUrl();
            const isYouTube = currentUrl?.includes('youtube.com/watch');

            if (!transcript) {
                if (isYouTube) {
                    await handlers.handleFetchTranscript();
                } else {
                    await handlers.handleFetchWebpage();
                }
                transcript = transcriptArea.value.trim();
            }

            const pageTitle = await utils.getVideoTitle() || document.title || "Content";
            const container = document.querySelector('#panel-content');

            const aiSettings = await api.getAiSettings();
            state.contextSize = aiSettings.numCtx; // Store context size

            const systemPrompt = systemPromptArea.value;
            let processedContent = transcript;

            // Only process chunks if enabled and content is too large
            if (enableChunking?.checked) {
                const estimatedTokens = utils.estimateTokens(transcript);
                const systemPromptTokens = utils.estimateTokens(systemPrompt);
                const messageFormatTokens = 8;
                const safetyMargin = 50;
                const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;

                if (estimatedTokens + totalOverhead > aiSettings.numCtx) {
                    processedContent = await utils.chunkAndSummarize(
                        transcript,
                        aiSettings.numCtx,
                        aiSettings,
                        systemPrompt
                    );
                }
            }

            // If we get here, either chunking is disabled or content fits in context
            // Continue with normal summary view switch
            container.innerHTML = renderTemplate('summary', {
                model: aiSettings.model
            });

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
                    setupStreamingChatHandlers(
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
    },

    async handleCopyToClipboard() {
        const transcriptArea = document.getElementById("transcript-area");
        try {
            await navigator.clipboard.writeText(transcriptArea.value);
            alert("Transcript copied to clipboard!");
        } catch (error) {
            alert(`Failed to copy text to clipboard. ${error.message}`);
        }
    },

    async handleManagePrompts() {
        const container = document.querySelector('#panel-content');
        if (!container) return;

        // Render prompt manager
        container.innerHTML = renderTemplate('promptManager', {});

        // Initialize prompt manager
        initializePromptManager();

        // Add back button that returns to main view
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => {
            // Reset to main view
            container.innerHTML = renderTemplate('mainView', {});
            initializeUI();
        });

        // Insert back button at the top
        const promptManager = container.querySelector('.prompt-manager');
        promptManager.insertBefore(backBtn, promptManager.firstChild);
    },

    async handleSettings() {
        const container = document.querySelector('#panel-content');
        if (!container) return;

        // Render settings template
        container.innerHTML = renderTemplate('settings', {});

        // Initialize settings
        const elements = {
            aiUrl: document.getElementById('ai-url'),
            aiModel: document.getElementById('ai-model'),
            numCtx: document.getElementById('num-ctx'),
            fetchModels: document.getElementById('fetch-models'),
            saveSettings: document.getElementById('save-settings')
        };

        // Load current settings
        const settings = await api.getAiSettings();
        elements.aiUrl.value = settings.url;
        elements.numCtx.value = settings.numCtx;

        // Add back button that returns to main view
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => {
            // Reset to main view
            container.innerHTML = renderTemplate('mainView', {});
            initializeUI();
        });

        // Insert back button
        const settingsContent = container.querySelector('.settings-content');
        settingsContent.insertBefore(backBtn, settingsContent.firstChild);

        // Fetch models handler
        elements.fetchModels.addEventListener('click', async () => {
            try {
                elements.aiModel.disabled = true;
                elements.aiModel.innerHTML = '<option value="">Loading...</option>';

                const response = await fetch(`${elements.aiUrl.value}/api/tags`);
                if (!response.ok) throw new Error('Failed to fetch models');

                const data = await response.json();
                const models = data.models || [];

                elements.aiModel.innerHTML = models
                    .map(model => `<option value="${model.name}">
                        ${model.name} (${utils.formatSize(model.size)})
                    </option>`)
                    .join('');

                elements.aiModel.value = settings.model;
                elements.aiModel.disabled = false;
            } catch (error) {
                alert(`Error fetching models: ${error.message}`);
                elements.aiModel.innerHTML = '<option value="">Error loading models</option>';
            }
        });

        // Save settings handler
        elements.saveSettings.addEventListener('click', async () => {
            try {
                await chrome.storage.sync.set({
                    aiUrl: elements.aiUrl.value,
                    aiModel: elements.aiModel.value,
                    numCtx: parseInt(elements.numCtx.value)
                });
                alert('Settings saved successfully!');
            } catch (error) {
                alert(`Error saving settings: ${error.message}`);
            }
        });

        // Initial model fetch
        elements.fetchModels.click();
    }
};

// Updated chat handlers to support streaming and markdown
async function setupStreamingChatHandlers(formattedSummary, chatInput, sendButton, aiSettings) {
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Create message elements
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `
            <div>
                ${markdownToHtml(message)}
            </div>
        `;

        ui.autoScroll(true);

        formattedSummary.appendChild(userMessage);

        chatInput.value = '';
        ui.toggleChatElements(true);
        ui.autoScroll(true);

        try {
            state.conversationHistory.push({
                role: 'user',
                content: message
            });

            // Update token count
            ui.updateTokenCount(formattedSummary.closest('.chat-container'));

            // Create and append AI message element
            const aiMessage = document.createElement('div');
            formattedSummary.appendChild(aiMessage);

            // Send just the message, not the whole conversation history
            const response = await chat.handleStreamingAIResponse(
                aiSettings,
                message,  // Send only the latest message
                aiMessage
            );

            state.conversationHistory.push({
                role: 'assistant',
                content: response
            });

            // Update token count again after response
            ui.updateTokenCount(formattedSummary.closest('.chat-container'));

            ui.autoScroll(true);
        } catch (error) {
            console.error('Chat error:', error);
        } finally {
            ui.toggleChatElements(false);
            chatInput.focus();
        }
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Initialize function that handles both popup and side panel
function initializeUI() {
    const elements = {
        openOptions: document.getElementById("open-options"),
        managePrompts: document.getElementById("manage-prompts"),
        fetchTranscript: document.getElementById("fetch-current-transcript"),
        fetchWebpage: document.getElementById("fetch-webpage"),
        copyClipboard: document.getElementById("copy-to-clipboard"),
        summarize: document.getElementById("summarize-transcript"),
        promptSelector: document.getElementById("prompt-selector"),
        systemPrompt: document.getElementById("system-prompt")
    };

    // Main button handlers
    elements.openOptions?.addEventListener("click", handlers.handleSettings);
    elements.managePrompts?.addEventListener("click", handlers.handleManagePrompts);
    elements.fetchTranscript?.addEventListener("click", handlers.handleFetchTranscript);
    elements.fetchWebpage?.addEventListener("click", handlers.handleFetchWebpage);
    elements.copyClipboard?.addEventListener("click", handlers.handleCopyToClipboard);
    elements.summarize?.addEventListener("click", handlers.handleSummarize);

    // Prompt selector handler - only updates textarea content
    if (elements.promptSelector && elements.systemPrompt) {
        elements.promptSelector.addEventListener('change', async () => {
            const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');
            const defaultPrompt = await api.getSystemPrompt();

            const selectedPattern = elements.promptSelector.value;
            elements.systemPrompt.value = selectedPattern === 'default'
                ? defaultPrompt
                : savedPrompts[selectedPattern].content;
        });
    }

    // Load initial prompts and system prompt
    ui.loadSystemPrompt();
    ui.loadPromptSelector();
}

const promptManager = {
    async savePrompt(pattern, prompt, makeDefault = false) {
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

        // If making this prompt default, remove default flag from others
        if (makeDefault) {
            Object.keys(savedPrompts).forEach(key => {
                if (savedPrompts[key].isDefault) {
                    savedPrompts[key] = {
                        ...savedPrompts[key],
                        isDefault: false
                    };
                }
            });
        }

        // Clean pattern and save prompt
        const cleanPattern = pattern.replace(/^www\./, '');
        savedPrompts[cleanPattern] = {
            content: prompt,
            isDefault: makeDefault
        };

        await chrome.storage.sync.set({ savedPrompts });
    },

    patternToRegex(pattern) {
        // Split into path and query parts
        const [pathPart, queryPart] = pattern.split('?');

        // Build path regex
        let pathRegex = '^' + pathPart
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
            .replace(/\*/g, '[^?]*');              // * matches anything except ?

        // Add query parameters if they exist
        if (queryPart) {
            pathRegex += '\\?';
            const queryParams = queryPart.split('&').map(param => {
                return param.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '[^&]*');
            });

            // Allow query parameters in any order
            pathRegex += queryParams
                .map(param => `(?=.*${param})`)
                .join('');

            pathRegex += '[^#]*';  // Match rest of query string until fragment
        }

        return new RegExp(pathRegex);
    },

    findBestMatchForUrl(url, patterns) {
        // Clean the URL for matching
        const cleanUrl = url.replace(/^www\./, '');

        // Convert patterns to regex and find matches
        const matches = patterns
            .map(pattern => ({
                pattern,
                regex: this.patternToRegex(pattern),
                specificity: this.calculateSpecificity(pattern)
            }))
            .filter(({ pattern, regex }) => {
                try {
                    return regex.test(cleanUrl);
                } catch (e) {
                    console.error('Regex error for pattern:', pattern, e);
                    return false;
                }
            })
            .sort((a, b) => {
                // Sort by specificity first
                const specificityDiff = b.specificity - a.specificity;
                if (specificityDiff !== 0) return specificityDiff;

                // If same specificity, prefer longer pattern
                return b.pattern.length - a.pattern.length;
            });

        return matches[0]?.pattern;
    },

    calculateSpecificity(pattern) {
        // Count non-wildcard segments
        const segments = pattern.split('/');
        const queryParts = pattern.split('?')[1]?.split('&') || [];

        return segments.filter(s => s !== '*').length +
               queryParts.filter(p => p !== '*').length;
    },
};

async function loadPrompts() {
    const promptsList = document.getElementById('prompts-list');
    const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

    promptsList.innerHTML = Object.entries(savedPrompts)
        .map(([pattern, promptData]) => renderTemplate('promptItem', {
            pattern,
            promptContent: promptData.content,
            defaultClass: promptData.isDefault ? ' is-default' : '',
            defaultText: promptData.isDefault ? '✓ Default' : 'Make Default'
        }))
        .join('');
}

function initializePromptManager() {
    const saveBtn = document.getElementById('save-prompt');
    const useCurrentUrlBtn = document.getElementById('use-current-url');
    const patternInput = document.getElementById('prompt-pattern');
    const promptContent = document.getElementById('prompt-content');
    const promptsList = document.getElementById('prompts-list');

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
        await loadPrompts();

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
            await loadPrompts();
            break;

        case 'default':
            // Update the prompt to be default
            await promptManager.savePrompt(
                pattern,
                savedPrompts[pattern].content,
                true
            );
            await loadPrompts();
            break;
        }
    });

    loadPrompts();
}