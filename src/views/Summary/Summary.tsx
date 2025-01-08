import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { markdownToHtml, handleStreamingAIResponse } from '@/utils/chat';
import { api } from '@/api/api';
import { getDefaultPrompt } from '@/utils/prompts';

interface SummaryProps {
    pageTitle?: string;
    content?: string;
}

export const Summary = ({ pageTitle = '', content = '' }: SummaryProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
    const [settings, setSettings] = useState<any>(null);
    const formattedSummaryRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const initializeSummary = async () => {
            const settings = await api.getAiSettings();
            setSettings(settings);

            try {
                const systemPrompt = await getDefaultPrompt();

                // Initialize conversation history
                setChatHistory([
                    { role: 'system', content: systemPrompt.content },
                    { role: 'user', content: `${pageTitle}\n\n${content}` }
                ]);

                // Add initial message to the UI
                if (formattedSummaryRef.current) {
                    formattedSummaryRef.current.innerHTML = `
                        <div class="message user-message">
                            <div>
                                ${markdownToHtml(`${systemPrompt.content}\n\n${content}`)}
                            </div>
                        </div>
                    `;
                }

                // Start streaming AI response
                setIsLoading(true);
                const response = await handleStreamingAIResponse(
                    settings,
                    content,
                    formattedSummaryRef.current
                );

                // Update chat history with response
                setChatHistory(prev => [
                    ...prev,
                    { role: 'user', content },
                    { role: 'assistant', content: response }
                ]);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        initializeSummary();
    }, [ ]);

    const handleSendMessage = async () => {
        if (!chatInputRef.current?.value.trim()) return;

        const message = chatInputRef.current.value;
        chatInputRef.current.value = '';

        try {
            setIsLoading(true);

            // Add user message to chat
            if (formattedSummaryRef.current) {
                formattedSummaryRef.current.innerHTML += `
                    <div class="message user-message">
                        <div>${markdownToHtml(message)}</div>
                    </div>
                `;
            }

            // Get AI response
            const response = await handleStreamingAIResponse(
                settings,
                message,
                formattedSummaryRef.current
            );

            // Update chat history
            setChatHistory(prev => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            ]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    if (!settings) return null;

    return (
        <div className="summary-content">
            <div className="model-label">
                <span className="glow text">Model: {settings.model}</span>
            </div>
            <div className="main-content">
                <div id="chat-container" className="chat-container" role="log" aria-live="polite">
                    <div id="chat-messages" className="chat-messages">
                        <div ref={formattedSummaryRef} id="formatted-summary" className="markdown-body"></div>
                    </div>

                    {isLoading && (
                        <div id="chat-loading" className="chat-loading">
                            <div className="neon-loader">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} />
                                ))}
                            </div>
                            <div className="token-display"></div>
                            <div className="button-group loading-controls">
                                <Link href="/"><button className="btn">← Back</button></Link>
                                <button className="btn danger-btn">Stop</button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-text">
                            Error generating summary: {error}
                        </div>
                    )}

                    <div className={`chat-input-container ${isLoading ? 'hidden' : ''}`}>
                        <textarea
                            ref={chatInputRef}
                            id="chat-input"
                            rows={3}
                            placeholder="Ask a question about the content..." />
                        <div className="token-display"></div>
                        <div className="button-group">
                            <Link href="/"><button className="btn">← Back</button></Link>
                            <button
                                id="send-message"
                                className="btn"
                                onClick={handleSendMessage}
                                disabled={isLoading}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
