import { renderTemplateAndInitialize } from './templates.js';
import { api } from './api.js';
import { utils } from './utils.js';
import { state } from './state.js';
import { ui } from './ui.js';
import { markdownToHtml } from './markdown.js';
import { chat } from './chat.js';

export const handlers = {
    async setupStreamingChatHandlers(formattedSummary, chatInput, sendButton, aiSettings) {
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
    },

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

        const data = {
            pageTitle,
            processedContent,
            systemPrompt,
            aiSettings
        };

        renderTemplateAndInitialize('summary', data);
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
        renderTemplateAndInitialize('promptManager', {});
    }

};