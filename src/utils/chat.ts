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

// Streaming response from the server
export async function handleStreamingAIResponse(settings: { url: string; model: string; numCtx: number }, message: string, onUpdate: (content: string) => void ): Promise<string> {
    let fullResponse = '';

    try {
        const response = await fetch(`${settings.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({
                model: settings.model,
                messages: [{ role: 'user', content: message }],
                stream: true
            })
        });

        const reader = response.body?.getReader();
        console.log('Reader:', reader);
        if (!reader) throw new Error('Failed to get response reader');

        while (true) {
            const { done, value } = await reader.read();
            console.log('Done:', done);
            console.log('Value:', value);
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
                const json = JSON.parse(line);
                if (json.response) {
                    fullResponse += json.response;
                    onUpdate(markdownToHtml(fullResponse));
                }
            }
        }

        console.log('Full response:', fullResponse);
        return fullResponse;

    } catch (error) {
        console.error('Error in streaming response:', error);
        throw error;
    }
}

export async function handleStreamingResponse(
    settings: { url: string; model: string; numCtx: number },
    prompt: string,
    onUpdate: (content: string) => void,
    conversationHistory: { role: string; content: string }[] = [],
    systemPromptOverride = null
) {
    try {
        const endpoint = `${settings.url}/api/chat`;
        let abortController = new AbortController();

        // Include conversation history in messages
        const messages = [
            { role: 'system', content: systemPromptOverride },
            ...conversationHistory,
            { role: 'user', content: prompt }
        ].filter(msg => msg.content != null); // Filter out null system prompt if not provided

        const requestBody = {
            model: settings.model,
            messages: messages,
            options: {
                temperature: 0.8,
                num_ctx: settings.numCtx,
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

        const reader = response.body?.getReader();
        let accumulatedResponse = '';

        try {
            while (true) {
                if (!reader) {
                    break;
                }

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
                            accumulatedResponse += data.message.content;
                            onUpdate(markdownToHtml(accumulatedResponse));
                        }
                    } catch (e) {
                        console.error('Error parsing JSON:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error in handleStreamingAIResponse:', error);
            throw error;
        }

        return accumulatedResponse;
    } catch (error) {
        console.error('Error in handleStreamingAIResponse:', error);
        throw error;
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

export function calculateConversationTokens(history: any[]) {
    // Add extra tokens for message formatting and role indicators
    const formatTokens = history.length * 4; // ~4 tokens per message for format

    // Sum up tokens from all messages
    const contentTokens = history.reduce((total, message) => {
        return total + estimateTokens(message.content);
    }, 0);

    return formatTokens + contentTokens;
}

export function updateTokenCount(conversationHistory: any[]) {
    const totalTokens = parseInt(calculateConversationTokens(conversationHistory), 10);
    return totalTokens;
}
