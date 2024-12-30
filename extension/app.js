const state = {
    videos: [],
    currentIndex: 0,
    conversationHistory: []
};

// Utility functions
const utils = {
    extractVideoId(url) {
        const match = url.match(/v=([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    },

    sanitizePrompt(prompt) {
        return prompt.replace(/[<>]/g, '').slice(0, 500);
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

    async openPopupWindow(url, options = {}) {
        const defaultOptions = {
            width: 800,
            height: 630,
            type: 'popup'
        };
        return chrome.windows.create({ ...defaultOptions, ...options, url });
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
            const splittedHtml = html.split('"captions":');

            if (splittedHtml.length <= 1) {
                throw new Error('No captions found in video');
            }

            const captionsJson = JSON.parse(
                splittedHtml[1].split(',"videoDetails')[0].replace(/\n/g, '')
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
    }
};

// API interactions
const api = {
    async getApiUrl() {
        const { apiUrl } = await chrome.storage.sync.get("apiUrl");
        return apiUrl || CONSTANTS.API.DEFAULT_API_URL;
    },

    async getAiSettings() {
        const { aiUrl, aiModel } = await chrome.storage.sync.get(["aiUrl", "aiModel"]);
        return {
            url: `${aiUrl || CONSTANTS.API.DEFAULT_AI_URL}/api/generate`,
            model: aiModel || CONSTANTS.API.DEFAULT_AI_MODEL
        };
    },

    async getSystemPrompt() {
        const { systemPrompt } = await chrome.storage.sync.get(['systemPrompt']);
        return systemPrompt || CONSTANTS.API.DEFAULT_SYSTEM_PROMPT;
    },

    async sendVideoToServer(videoId, videoTitle) {
        const serverUrl = await this.getApiUrl();
        const url = `${serverUrl}/fetch_transcript?id=${videoId}&title=${encodeURIComponent(videoTitle)}`;

        try {
            const response = await fetch(url, { method: "GET" });
            await response.json();
            return response.ok;
        } catch (error) {
            console.error(`Network error for ${videoTitle}:`, error);
            return false;
        }
    },

    async processVideosSequentially() {
        for (state.currentIndex = 0; state.currentIndex < state.videos.length; state.currentIndex++) {
            const video = state.videos[state.currentIndex];
            const videoId = utils.extractVideoId(video.url);

            if (!videoId) {
                console.error(`Invalid video URL: ${video.url}`);
                continue;
            }

            console.log(`Processing (${state.currentIndex + 1}/${state.videos.length}): ${video.title}`);
            await api.sendVideoToServer(videoId, video.title);
        }

        alert("All videos have been processed!");
    }

};

// Event handlers
const handlers = {
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
            let transcript = transcriptArea.value.trim();

            if (!transcript) {
                await this.handleFetchTranscript();
                transcript = transcriptArea.value.trim();
            }

            const container = document.querySelector('#panel-content');
            if (!container) return;

            const videoTitle = await utils.getVideoTitle(await utils.getCurrentVideoId());

            // Render the summary template
            container.innerHTML = renderTemplate('summary', {
                title: videoTitle,
                transcript
            });

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
                    <div class="message-content">
                        ${markdownToHtml(transcript)}
                    </div>
                </div>
            `;

            ui.autoScroll(true);

            try {
                ui.toggleChatElements(true);

                const aiSettings = await api.getAiSettings();
                const systemPrompt = await api.getSystemPrompt();

                // Initialize conversation history
                state.conversationHistory = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: transcript }
                ];

                const aiMessage = document.createElement('div');
                aiMessage.className = 'message assistant-message';
                elements.formattedSummary.appendChild(aiMessage);

                const prompt = chat.formatConversationPrompt(state.conversationHistory);
                const response = await chat.handleStreamingAIResponse(aiSettings, prompt, aiMessage);

                state.conversationHistory.push({
                    role: 'assistant',
                    content: response
                });

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
                    <div class="error-message">
                        Error generating summary: ${error.message}
                    </div>
                `;
                ui.autoScroll(true);
            }
        } catch (error) {
            console.error('Error in handleSummarize:', error);
            alert('Failed to generate summary: ' + error.message);
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

    async handleFetchNotifications() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tabs[0].id, { action: "fetch_notifications" }, async () => {
            setTimeout(async () => {
                const { videos } = await chrome.storage.local.get("videos");
                if (videos?.length) {
                    state.videos = videos;
                    state.currentIndex = 0;
                    await api.processVideosSequentially();
                } else {
                    alert("No videos found to process.");
                }
            }, CONSTANTS.DELAYS.NOTIFICATION);
        });
    },

    async handleViewSummaries() {
        await utils.openPopupWindow('summary.html?view=library');
    },

    async handleOpenSettings() {
        await utils.openPopupWindow('options.html', {
            width: 500,  // Smaller width for settings
            height: 630
        });
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
            <div class="message-content">
                ${markdownToHtml(message)}
            </div>
        `;
        formattedSummary.appendChild(userMessage);

        const aiMessage = document.createElement('div');
        aiMessage.className = 'message assistant-message';
        formattedSummary.appendChild(aiMessage);

        chatInput.value = '';
        ui.toggleChatElements(true);
        ui.autoScroll(true);

        try {
            state.conversationHistory.push({
                role: 'user',
                content: message
            });

            const prompt = chat.formatConversationPrompt(state.conversationHistory);
            const response = await chat.handleStreamingAIResponse(aiSettings, prompt, aiMessage);

            state.conversationHistory.push({
                role: 'assistant',
                content: response
            });

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
        fetchTranscript: document.getElementById("fetch-current-transcript"),
        copyClipboard: document.getElementById("copy-to-clipboard"),
        summarize: document.getElementById("summarize-transcript"),
        fetchNotifications: document.getElementById("fetch-notifications"),
        viewSummaries: document.getElementById("view-summaries"),
    };

    const boundHandlers = {
        handleOpenSettings: handlers.handleOpenSettings.bind(handlers),
        handleFetchTranscript: handlers.handleFetchTranscript.bind(handlers),
        handleCopyToClipboard: handlers.handleCopyToClipboard.bind(handlers),
        handleSummarize: handlers.handleSummarize.bind(handlers),
        handleFetchNotifications: handlers.handleFetchNotifications.bind(handlers),
        handleViewSummaries: handlers.handleViewSummaries.bind(handlers),
    };

    // Attach event listeners with bound handlers
    if (elements.openOptions) elements.openOptions.addEventListener("click", boundHandlers.handleOpenSettings);
    if (elements.fetchTranscript) elements.fetchTranscript.addEventListener("click", boundHandlers.handleFetchTranscript);
    if (elements.copyClipboard) elements.copyClipboard.addEventListener("click", boundHandlers.handleCopyToClipboard);
    if (elements.summarize) elements.summarize.addEventListener("click", boundHandlers.handleSummarize);
    if (elements.fetchNotifications) elements.fetchNotifications.addEventListener("click", boundHandlers.handleFetchNotifications);
    if (elements.viewSummaries) elements.viewSummaries.addEventListener("click", boundHandlers.handleViewSummaries);
}

// Add to the chat utilities section
const chat = {
    async handleStreamingAIResponse(aiSettings, prompt, messageElement) {
        const response = await fetch(aiSettings.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: aiSettings.model,
                prompt,
                stream: true
            })
        });

        const reader = response.body.getReader();
        let accumulatedResponse = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            accumulatedResponse += json.response;
                            messageElement.innerHTML = `
                                <div class="message-content">
                                    ${markdownToHtml(accumulatedResponse)}
                                </div>
                            `;
                            ui.autoScroll();
                        }
                    } catch (e) {
                        console.warn('Failed to parse JSON:', e);
                    }
                }
            }

            return accumulatedResponse;
        } catch (error) {
            messageElement.innerHTML = `
                <div class="error-message">
                    Error: ${error.message}
                </div>
            `;
            throw error;
        }
    },

    formatConversationPrompt(history) {
        return history.map(msg =>
            msg.role === 'system' ? `System: ${msg.content}` :
                msg.role === 'user' ? `Human: ${msg.content}` :
                    `Assistant: ${msg.content}`
        ).join('\n\n') + '\n\nAssistant:';
    }
};

// Add to the UI utilities section
const ui = {
    toggleChatElements(loading = false) {
        const chatInputContainer = document.querySelector('.chat-input-container');
        const chatLoading = document.querySelector('#chat-loading');

        chatInputContainer.classList.toggle('hidden', loading);
        chatLoading.classList.toggle('hidden', !loading);
    },

    autoScroll(force = false) {
        const element = document.getElementById("chat-messages");
        const isUserScrolledUp = element.scrollHeight - element.clientHeight - element.scrollTop > CONSTANTS.UI.SCROLL_TOLERANCE;

        if (!isUserScrolledUp || force) {
            element.scrollTop = element.scrollHeight;
        }
    }
};