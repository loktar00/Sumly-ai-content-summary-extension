import { CONSTANTS } from '@/constants';
import { ModelConfig } from '@/Configs/ModelProviders';

// Simple markdown parser
export const markdownToHtml = (markdown: string) => {
    return markdown
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')

        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

        // Lists
        .replace(/^\s*\n\*/gm, '<ul>\n*')
        .replace(/^(\*.+)\s*\n([^*])/gm, '$1\n</ul>\n$2')
        .replace(/^\*(.+)/gm, '<li>$1</li>')

        // Headings
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')

        // Ordered Lists
        .replace(/^\s*\n\d\./gm, '<ol>\n1.')
        .replace(/^(\d\..+)\s*\n([^\d.])/gm, '$1\n</ol>\n$2')
        .replace(/^\d\.(.+)/gm, '<li>$1</li>')

        // Blockquotes
        .replace(/^>(.+)/gm, '<blockquote>$1</blockquote>')

        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre><code><p>$1</p></code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Paragraphs
        .replace(/^\s*(\n)?(.+)/gm, function(m) {
            return /<(\/)?(h\d|ul|ol|li|blockquote|pre|code)/.test(m) ? m : '<p>'+m+'</p>';
        })
};

export async function handleStreamingResponse(
    settings: ModelConfig,
    prompt: string,
    onUpdate: (content: string) => void,
    conversationHistory: { role: string; content: string }[] = [],
    systemPromptOverride: string | null = null,
    abortController?: AbortController
) {

    let accumulatedResponse = '';
    try {
        const controller = abortController || new AbortController();
        const messages = [
            { role: 'system', content: systemPromptOverride },
            ...conversationHistory,
            { role: 'user', content: prompt }
        ].filter(msg => msg.content != null);

        if (settings.provider === 'Deepseek') {
            const response = await fetch(`${settings.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.api_key}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: messages,
                    stream: true,
                    options: {
                        temperature: settings.temperature,
                        max_tokens: settings.max_tokens
                    }
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Deepseek API request failed (${response.status}): ${errorText || response.statusText}`);
            }

            const reader = response.body?.getReader();

            while (true) {
                const { done, value } = await reader!.read();
                if (done) {
                    break;
                }

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) {
                                accumulatedResponse += content;
                                onUpdate(accumulatedResponse);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } else {
            // Original Ollama implementation
            const response = await fetch(`${settings.url}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: settings.model,
                    messages: messages,
                    options: {
                        temperature: settings.temperature,
                        num_ctx: settings.num_ctx,
                    },
                    stream: true
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
            }

            const reader = response.body?.getReader();

            while (true) {
                const { done, value } = await reader!.read();

                if (done) {
                    break;
                }

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) {
                        continue;
                    }

                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            accumulatedResponse += data.message.content;
                            onUpdate(markdownToHtml(accumulatedResponse));
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        }

        return accumulatedResponse;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error;
        }
        throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function estimateTokens(text: string) {
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
}

export function calculateConversationTokens(history: { role: string; content: string }[]) {
    // Add extra tokens for message formatting and role indicators
    const formatTokens = history.length * 4; // ~4 tokens per message for format

    // Sum up tokens from all messages
    const contentTokens = history.reduce((total, message) => {
        return total + estimateTokens(message.content);
    }, 0);

    return formatTokens + contentTokens;
}

export function updateTokenCount(conversationHistory: { role: string; content: string }[]) {
    const totalTokens = calculateConversationTokens(conversationHistory);
    return totalTokens;
}

interface ChunkProgress {
    currentChunk: number;
    totalChunks: number;
    message: string;
}

export async function chunkAndSummarize(
    content: string,
    contextSize: number,
    settings: ModelConfig,
    systemPrompt: string,
    onProgressUpdate?: (progress: ChunkProgress) => void,
    onStreamingUpdate?: (content: string) => void,
    abortController?: AbortController
) {
    const CHUNK_SUMMARY_PROMPT = "Summarize the following content while retaining all important information:";

    // Calculate available tokens
    const systemPromptTokens = estimateTokens(systemPrompt);
    const messageFormatTokens = 8;  // 4 tokens each for system and user message
    const safetyMargin = 50;

    const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;
    const availableTokens = contextSize - totalOverhead;
    const estimatedTokens = estimateTokens(content);

    // If content fits in context, return as is
    if (estimatedTokens <= availableTokens) {
        return content;
    }

    // Calculate optimal chunk size
    const summaryPromptTokens = estimateTokens(CHUNK_SUMMARY_PROMPT);
    const chunkSize = Math.floor((availableTokens - summaryPromptTokens) * 0.9); // 90% of available space

    // Split content into chunks
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;

    const sentences = content.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

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

    // Notify of initial status
    if (onProgressUpdate) {
        onProgressUpdate({
            currentChunk: 0,
            totalChunks: chunks.length,
            message: `Content size (${estimatedTokens} tokens) exceeds context window (${contextSize} tokens). Breaking content into ${chunks.length} chunks for processing...`
        });
    }

    // Summarize each chunk
    const chunkSummaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        if (onProgressUpdate) {
            onProgressUpdate({
                currentChunk: i + 1,
                totalChunks: chunks.length,
                message: `Processing chunk ${i + 1} of ${chunks.length}...`
            });
        }

        const summary = await handleStreamingResponse(
            settings,
            chunks[i],
            onStreamingUpdate || (() => {}),
            [], // No conversation history for chunks
            CONSTANTS.API.DEFAULT_CHUNK_SUMMARY_PROMPT,
            abortController
        );

        chunkSummaries.push(summary);
    }

    // Notify of final processing
    if (onProgressUpdate) {
        onProgressUpdate({
            currentChunk: chunks.length,
            totalChunks: chunks.length,
            message: 'Combining summaries for final processing...'
        });
    }

    return chunkSummaries.join('\n\n');
}

export function formatSize(bytes: number): string {
    if (bytes === 0) {
        return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());

    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}