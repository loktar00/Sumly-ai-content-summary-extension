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
            throw new Error('Failed to fetch transcript: ' + error.message);
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
        await handlers.handleFetchTranscript();
        const transcriptArea = document.getElementById("transcript-area");
        const transcript = transcriptArea.value.trim();

        if (!transcript) {
            alert("Please fetch a transcript first!");
            return;
        }

        const videoId = await utils.getCurrentVideoId();
        const videoTitle = await utils.getVideoTitle(videoId);

        await chrome.storage.local.set({
            currentSummary: null,
            summaryStatus: 'loading',
            summaryError: null,
            currentVideo: {
                id: videoId,
                title: videoTitle
            },
            initialTranscript: transcript
        });

        await utils.openPopupWindow('summary.html');

        try {
            const aiSettings = await api.getAiSettings();
            const { systemPrompt } = await chrome.storage.sync.get(['systemPrompt']);

            const response = await fetch(aiSettings.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiSettings.model,
                    prompt: `System: ${utils.sanitizePrompt(systemPrompt || CONSTANTS.API.DEFAULT_SYSTEM_PROMPT)}\n\nHuman: Here's a transcript, please summarize it:\n${transcript}\n\nAssistant:`,
                    stream: false
                })
            });

            const result = await response.json();
            await chrome.storage.local.set({
                currentSummary: result.response,
                summaryStatus: 'complete'
            });
        } catch (error) {
            await chrome.storage.local.set({
                summaryStatus: 'error',
                summaryError: `Failed to get summary. Please check the AI endpoint in settings. ${error.message}`
            });
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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        openOptions: document.getElementById("open-options"),
        fetchTranscript: document.getElementById("fetch-current-transcript"),
        copyClipboard: document.getElementById("copy-to-clipboard"),
        summarize: document.getElementById("summarize-transcript"),
        fetchNotifications: document.getElementById("fetch-notifications"),
        viewSummaries: document.getElementById("view-summaries")
    };

    // Attach event listeners
    elements.openOptions.addEventListener("click", handlers.handleOpenSettings);
    elements.fetchTranscript.addEventListener("click", handlers.handleFetchTranscript);
    elements.copyClipboard.addEventListener("click", handlers.handleCopyToClipboard);
    elements.summarize.addEventListener("click", handlers.handleSummarize);
    elements.fetchNotifications.addEventListener("click", handlers.handleFetchNotifications);
    elements.viewSummaries.addEventListener("click", handlers.handleViewSummaries);
});