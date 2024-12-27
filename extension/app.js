console.log('Loading app.js...', new Date().toISOString());

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
    currentIndex: 0
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
        const decoder = document.createElement('textarea');

        return Array.from(xmlDoc.getElementsByTagName('text'))
            .map(node => ({
                text: node.textContent
                    .trim()
                    .replace(/&([^;]+);/g, (match) => {
                        decoder.innerHTML = match;
                        return decoder.value;
                    })
                    .replace(/\s+/g, ' ')
                    .replace(/\n/g, ' '),
                start: parseFloat(node.getAttribute('start')),
                duration: parseFloat(node.getAttribute('dur') || '0')
            }))
            .filter(line => line.text.length > 0)
            .map(line => line.text)
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
        if (state.currentIndex >= state.videos.length) {
            alert("All videos processed!");
            return;
        }

        const video = state.videos[state.currentIndex];
        const videoId = utils.extractVideoId(video.url);

        if (!videoId) {
            console.error("Could not extract video ID from:", video.url);
            state.currentIndex++;
            await this.processVideosSequentially();
            return;
        }

        const success = await this.sendVideoToServer(videoId, video.title);
        console.log(`Processed ${video.title}: ${success ? 'Success' : 'Failed'}`);

        state.currentIndex++;
        await this.processVideosSequentially();
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
        const transcript = document.getElementById("transcript-area").value;
        if (!transcript) {
            alert("Please fetch a transcript first.");
            return;
        }

        const videoId = await utils.getCurrentVideoId();
        if (!videoId) {
            alert("Could not determine video ID.");
            return;
        }

        const videoTitle = await utils.getVideoTitle(videoId);
        await utils.openPopupWindow(`summary.html?id=${videoId}&title=${encodeURIComponent(videoTitle)}`);
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
                    await this.processVideosSequentially();
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
            width: 500,
            height: 630
        });
    }
};

// Initialize function that handles both popup and side panel
function initializeUI(isSidePanel = false) {
    alert("initializeUI");
    console.log(`[UI] Initializing in ${isSidePanel ? 'side panel' : 'popup'} mode`);

    const elements = {
        openOptions: document.getElementById("open-options"),
        fetchTranscript: document.getElementById("fetch-current-transcript"),
        copyClipboard: document.getElementById("copy-to-clipboard"),
        summarize: document.getElementById("summarize-transcript"),
        fetchNotifications: document.getElementById("fetch-notifications"),
        viewSummaries: document.getElementById("view-summaries"),
        toggleSidePanel: document.getElementById("toggle-side-panel")
    };

    // Log which elements were found
    console.log('Found elements:', Object.entries(elements).reduce((acc, [key, val]) => {
        acc[key] = !!val;
        return acc;
    }, {}));

    // Bind API methods to preserve context
    const boundApi = {
        handleOpenSettings: api.handleOpenSettings.bind(api),
        handleFetchTranscript: api.handleFetchTranscript.bind(api),
        handleCopyToClipboard: api.handleCopyToClipboard.bind(api),
        handleSummarize: api.handleSummarize.bind(api),
        handleFetchNotifications: api.handleFetchNotifications.bind(api),
        handleViewSummaries: api.handleViewSummaries.bind(api)
    };

    // Attach event listeners using bound api handlers
    elements.openOptions?.addEventListener("click", boundApi.handleOpenSettings);
    elements.fetchTranscript?.addEventListener("click", boundApi.handleFetchTranscript);
    elements.copyClipboard?.addEventListener("click", boundApi.handleCopyToClipboard);
    elements.summarize?.addEventListener("click", boundApi.handleSummarize);
    elements.fetchNotifications?.addEventListener("click", boundApi.handleFetchNotifications);
    elements.viewSummaries?.addEventListener("click", boundApi.handleViewSummaries);

    // Only show side panel toggle in popup mode
    if (!isSidePanel && elements.toggleSidePanel) {
        elements.toggleSidePanel.addEventListener("click", async () => {
            console.log("SIDE PANEL BUTTON CLICKED");
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
            } catch (error) {
                console.error('Side panel error:', error);
                alert('Failed to open side panel: ' + error.message);
            }
        });
    }
}