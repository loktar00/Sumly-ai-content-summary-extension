// Utility functions
import { CONSTANTS } from './constants.js';
import { renderTemplate } from './templates.js';
import { ui } from './ui.js';
import { chat } from './chat.js';

export const utils = {

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