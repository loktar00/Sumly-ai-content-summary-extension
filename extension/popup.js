const DEFAULT_API_URL = "http://localhost:8892";
const DEFAULT_AI_URL = "http://localhost:11434";
const DEFAULT_AI_MODEL = "mistral";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Please provide concise, unbiased summaries.";
const NOTIFICATION_DELAY = 3000;

const state = {
    videos: [], // List of videos to process
    currentIndex: 0 // Track the current video being processed
};

const utils = {
    extractVideoId(url) {
        const match = url.match(/v=([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    },

    async getCurrentVideoId() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.url) return null;

        const url = new URL(tabs[0].url);
        return url.searchParams.get("v");
    },

    async getVideoTitle(videoId) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.title) {
                return tabs[0].title.replace(' - YouTube', '');
            }
            return `Video ${videoId}`;
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

        const windowOptions = { ...defaultOptions, ...options, url };
        return chrome.windows.create(windowOptions);
    }
};

const api = {
    async getApiUrl() {
        const { apiUrl } = await chrome.storage.sync.get("apiUrl");
        return apiUrl || DEFAULT_API_URL;
    },

    async getAiSettings() {
        const { aiUrl, aiModel } = await chrome.storage.sync.get(["aiUrl", "aiModel"]);
        return {
            url: `${aiUrl || DEFAULT_AI_URL}/api/generate`,
            model: aiModel || DEFAULT_AI_MODEL
        };
    },

    async sendVideoToServer(videoId, videoTitle) {
        const serverUrl = await this.getApiUrl();
        const url = `${serverUrl}/fetch_transcript?id=${videoId}&title=${encodeURIComponent(videoTitle)}`;

        try {
            const response = await fetch(url, { method: "GET" });
            await response.json();
            return response.ok || false;
        } catch (error) {
            console.error(`Network error for ${videoTitle}:`, error);
            return false;
        }
    }
};

async function processVideosSequentially() {
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

const handlers = {
    async handleFetchTranscript() {
        const videoId = await utils.getCurrentVideoId();
        const transcriptArea = document.getElementById("transcript-area");

        if (!videoId) {
            alert("Could not determine video ID. Please ensure you're on a YouTube video page.");
            return;
        }

        transcriptArea.value = "Fetching transcript...";
        const serverUrl = await api.getApiUrl();
        const url = `${serverUrl}/fetch_transcript?id=${videoId}&title=Current+Video&return_only=true`;

        try {
            const response = await fetch(url);
            const result = await response.json();
            transcriptArea.value = result.status === "success" ? result.transcript : "Transcript not available.";
        } catch (error) {
            transcriptArea.value = `Error fetching transcript. ${error.message}`;
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
                    prompt: `System: ${systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\nHuman: Here's a transcript, please summarize it:\n${transcript}\n\nAssistant:`,
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
                    await processVideosSequentially();
                } else {
                    alert("No videos found to process.");
                }
            }, NOTIFICATION_DELAY);
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
// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("open-options").addEventListener("click", handlers.handleOpenSettings);
    document.getElementById("fetch-current-transcript").addEventListener("click", handlers.handleFetchTranscript);
    document.getElementById("copy-to-clipboard").addEventListener("click", handlers.handleCopyToClipboard);
    document.getElementById("summarize-transcript").addEventListener("click", handlers.handleSummarize);
    document.getElementById("fetch-notifications").addEventListener("click", handlers.handleFetchNotifications);
    document.getElementById("view-summaries").addEventListener("click", handlers.handleViewSummaries);
});