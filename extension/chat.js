import { ui } from './ui.js';
import { state } from './state.js';
import { markdownToHtml } from './markdown.js';

export const chat = {
    async handleStreamingAIResponse(aiSettings, prompt, parentElement, systemPromptOverride = null) {
        try {
            const baseUrl = aiSettings.url;
            const endpoint = `${baseUrl}/api/chat`;
            let abortController = new AbortController();

            // Setup stop and cancel handlers
            const stopBtn = document.getElementById('stop-generation');
            const cancelBtn = document.getElementById('cancel-generation');

            if (stopBtn) {
                stopBtn.addEventListener('click', () => {
                    console.log('Stopping generation');
                    abortController.abort();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    abortController.abort();
                    location.reload();
                });
            }

            const messages = systemPromptOverride
                ? [
                    { role: 'system', content: systemPromptOverride },
                    { role: 'user', content: prompt }
                ]
                : [
                    ...state.conversationHistory,
                    { role: 'user', content: prompt }
                ];

            const requestBody = {
                model: aiSettings.model,
                messages: messages,
                options: {
                    temperature: 0.8,
                    num_ctx: aiSettings.numCtx,
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

            const reader = response.body.getReader();
            let accumulatedResponse = '';
            let messageElement = null;

            try {
                while (true) {
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
                                if (!messageElement) {
                                    messageElement = document.createElement('div');
                                    messageElement.className = 'message assistant-message';
                                    parentElement.appendChild(messageElement);
                                }

                                accumulatedResponse += data.message.content;
                                messageElement.innerHTML = markdownToHtml(accumulatedResponse);
                                ui.autoScroll();
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Generation stopped by user.');
                    if (messageElement) {
                        messageElement.innerHTML += '<p><em>Generation stopped by user.</em></p>';
                    }

                    return accumulatedResponse;
                }
                throw error;
            }

            return accumulatedResponse;
        } catch (error) {
            console.error('Error in handleStreamingAIResponse:', error);
            throw error;
        }
    }
};