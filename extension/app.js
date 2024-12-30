const CONSTANTS = {
    API: {
        DEFAULT_API_URL: "http://localhost:8892",
        DEFAULT_AI_URL: "http://localhost:11434",
        DEFAULT_AI_MODEL: "mistral",
        DEFAULT_SYSTEM_PROMPT: "You are a helpful AI assistant. Please provide concise, unbiased summaries."
    },
    DELAYS: {
        NOTIFICATION: 3000
    }
};

// State management
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
            if (!container) {
                return;
            }

            const videoTitle = await utils.getVideoTitle(await utils.getCurrentVideoId());

            // Render the summary template
            container.innerHTML = renderTemplate('summary', {
                title: videoTitle,
                transcript
            });

            // Get references to elements after template is rendered
            const chatContainer = container.querySelector('#chat-container');
            const formattedSummary = container.querySelector('#formatted-summary');
            const chatLoading = container.querySelector('#chat-loading');
            const chatInput = container.querySelector('#chat-input');
            const sendButton = container.querySelector('#send-message');
            const backButton = container.querySelector('#back-to-transcript');

            if (!chatContainer || !formattedSummary || !chatLoading) {
                console.error('Required elements not found after template render');
                return;
            }

            // Add back button handler
            backButton.addEventListener('click', () => {
                location.reload();
            });

            // Add transcript as first message
            formattedSummary.innerHTML = `
                <div class="message user-message">
                    <div class="message-content">
                        ${markdownToHtml(transcript)}
                    </div>
                </div>
            `;

            // Force scroll to the bottom
            autoScroll(true);

            try {
                // Show loading state
                chatLoading.classList.remove('hidden');

                const aiSettings = await api.getAiSettings();
                const systemPrompt = (await chrome.storage.sync.get(['systemPrompt'])).systemPrompt || CONSTANTS.API.DEFAULT_SYSTEM_PROMPT;

                // Initialize conversation history with system prompt
                state.conversationHistory = [{
                    role: 'system',
                    content: systemPrompt
                }];

                // Add the transcript as user message
                state.conversationHistory.push({
                    role: 'user',
                    content: transcript
                });

                const response = await fetch(aiSettings.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiSettings.model,
                        prompt: state.conversationHistory.map(msg =>
                            msg.role === 'system' ? `System: ${msg.content}` :
                            msg.role === 'user' ? `Human: ${msg.content}` :
                            `Assistant: ${msg.content}`
                        ).join('\n\n') + '\n\nAssistant:',
                        stream: true
                    })
                });

                const reader = response.body.getReader();
                let accumulatedResponse = '';

                // Create AI response message container
                const aiMessage = document.createElement('div');
                aiMessage.className = 'message assistant-message';
                formattedSummary.appendChild(aiMessage);

                // Process the stream
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
                                aiMessage.innerHTML = `
                                    <div class="message-content">
                                        ${markdownToHtml(accumulatedResponse)}
                                    </div>
                                `;
                                autoScroll(formattedSummary);
                            }
                        } catch (e) {
                            console.warn('Failed to parse JSON:', e);
                        }
                    }
                }

                // Force scroll when complete
                autoScroll(formattedSummary, true);

                // After getting the response, add it to history
                state.conversationHistory.push({
                    role: 'assistant',
                    content: accumulatedResponse
                });

                // Hide loading, show chat input
                chatLoading.classList.add('hidden');
                container.querySelector('.chat-input-container').classList.remove('hidden');

                // Setup chat functionality with streaming
                if (chatInput && sendButton) {
                    setupStreamingChatHandlers(formattedSummary, chatInput, sendButton, aiSettings);
                }
            } catch (error) {
                chatLoading.innerHTML = `
                    <div class="error-message">
                        Error generating summary: ${error.message}
                    </div>
                `;
                // Force scroll on error
                autoScroll(formattedSummary, true);
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
    },

    async handleToggleSidePanel() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Check if we're in the side panel by looking at the window type
            const isSidePanel = window.location.pathname.endsWith('side-panel.html');

            if (isSidePanel) {
                // Close side panel and open popup
                await chrome.sidePanel.setOptions({
                    enabled: false,
                    path: 'side-panel.html'
                });

                // Create popup window
                await chrome.action.setPopup({ popup: 'popup.html' });
                await chrome.action.openPopup();

                // Close the side panel
                window.close();
            } else {
                // Regular popup to side panel flow
                if (!tab.url.includes('youtube.com')) {
                    alert('Please navigate to a YouTube video first');
                    return;
                }

                await chrome.sidePanel.setOptions({
                    enabled: true,
                    path: 'side-panel.html'
                });

                await chrome.sidePanel.open({
                    windowId: tab.windowId
                });

                window.close();
            }
        } catch (error) {
            console.error('Side panel error:', error);
            alert('Failed to toggle side panel: ' + error.message);
        }
    }
};

// Add this helper function at the top level
function autoScroll(force = false) {
    const element = document.getElementById("chat-messages");
    // Check if user has scrolled up (tolerance of 100px from bottom)
    const isUserScrolledUp = element.scrollHeight - element.clientHeight - element.scrollTop > 100;

    // Only auto-scroll if user hasn't scrolled up or if we're forcing the scroll
    if (!isUserScrolledUp || force) {
        element.scrollTop = element.scrollHeight;
    }
}

// Updated chat handlers to support streaming and markdown
async function setupStreamingChatHandlers(formattedSummary, chatInput, sendButton, aiSettings) {
    const chatInputContainer = document.querySelector('.chat-input-container');
    const chatLoading = document.querySelector('#chat-loading');

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Create new message elements
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

        // Hide input, show loading
        chatInputContainer.classList.add('hidden');
        chatLoading.classList.remove('hidden');

        // Force scroll after user message
        autoScroll(true);

        try {
            // Add user message to history
            state.conversationHistory.push({
                role: 'user',
                content: message
            });

            // Send the entire conversation history
            const response = await fetch(aiSettings.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiSettings.model,
                    prompt: state.conversationHistory.map(msg =>
                        msg.role === 'system' ? `System: ${msg.content}` :
                        msg.role === 'user' ? `Human: ${msg.content}` :
                        `Assistant: ${msg.content}`
                    ).join('\n\n') + '\n\nAssistant:',
                    stream: true
                })
            });

            const reader = response.body.getReader();
            let accumulatedResponse = '';

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
                            aiMessage.innerHTML = `
                                <div class="message-content">
                                    ${markdownToHtml(accumulatedResponse)}
                                </div>
                            `;
                            autoScroll();
                        }
                    } catch (e) {
                        console.warn('Failed to parse JSON:', e);
                    }
                }
            }

            // Add AI response to history
            state.conversationHistory.push({ role: 'assistant', content: accumulatedResponse });

            // Force scroll when complete
            autoScroll(true);

        } catch (error) {
            aiMessage.innerHTML = `
                <div class="error-message">
                    Error: ${error.message}
                </div>
            `;
            // Force scroll on error
            autoScroll(true);
        } finally {
            // Show input, hide loading
            chatLoading.classList.add('hidden');
            chatInputContainer.classList.remove('hidden');
            chatInput.focus(); // Optional: focus the input for immediate typing
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
function initializeUI(isSidePanel = false) {
    console.log(`[UI] Initializing in ${isSidePanel ? 'side panel' : 'popup'} mode`);

    // Add event listeners immediately, don't wait for DOMContentLoaded
    const elements = {
        openOptions: document.getElementById("open-options"),
        fetchTranscript: document.getElementById("fetch-current-transcript"),
        copyClipboard: document.getElementById("copy-to-clipboard"),
        summarize: document.getElementById("summarize-transcript"),
        fetchNotifications: document.getElementById("fetch-notifications"),
        viewSummaries: document.getElementById("view-summaries"),
        toggleSidePanel: document.getElementById("toggle-side-panel")
    };

    // Bind handlers to preserve 'this' context
    const boundHandlers = {
        handleOpenSettings: handlers.handleOpenSettings.bind(handlers),
        handleFetchTranscript: handlers.handleFetchTranscript.bind(handlers),
        handleCopyToClipboard: handlers.handleCopyToClipboard.bind(handlers),
        handleSummarize: handlers.handleSummarize.bind(handlers),
        handleFetchNotifications: handlers.handleFetchNotifications.bind(handlers),
        handleViewSummaries: handlers.handleViewSummaries.bind(handlers),
        handleToggleSidePanel: handlers.handleToggleSidePanel.bind(handlers)
    };

    // Attach event listeners with bound handlers
    if (elements.openOptions) elements.openOptions.addEventListener("click", boundHandlers.handleOpenSettings);
    if (elements.fetchTranscript) elements.fetchTranscript.addEventListener("click", boundHandlers.handleFetchTranscript);
    if (elements.copyClipboard) elements.copyClipboard.addEventListener("click", boundHandlers.handleCopyToClipboard);
    if (elements.summarize) elements.summarize.addEventListener("click", boundHandlers.handleSummarize);
    if (elements.fetchNotifications) elements.fetchNotifications.addEventListener("click", boundHandlers.handleFetchNotifications);
    if (elements.viewSummaries) elements.viewSummaries.addEventListener("click", boundHandlers.handleViewSummaries);
    if (elements.toggleSidePanel) elements.toggleSidePanel.addEventListener("click", boundHandlers.handleToggleSidePanel);
}