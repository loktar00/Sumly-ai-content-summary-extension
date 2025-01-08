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
export async function handleStreamingAIResponse(
    settings: { url: string; model: string; numCtx: number },
    message: string,
    outputElement: HTMLElement | null
): Promise<string> {
    if (!outputElement) throw new Error('Output element not found');

    // Add response container
    outputElement.innerHTML += `
        <div class="message assistant-message">
            <div class="assistant-content"></div>
        </div>
    `;

    const responseContainer = outputElement.querySelector('.assistant-content:last-child');
    if (!responseContainer) throw new Error('Response container not found');

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
        if (!reader) throw new Error('Failed to get response reader');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
                const json = JSON.parse(line);
                if (json.response) {
                    fullResponse += json.response;
                    responseContainer.innerHTML = markdownToHtml(fullResponse);
                }
            }
        }

        return fullResponse;

    } catch (error) {
        console.error('Error in streaming response:', error);
        throw error;
    }
}