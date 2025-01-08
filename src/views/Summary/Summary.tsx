import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { handleStreamingResponse } from '@/utils/chat';
import { api } from '@/api/api';
import { MessageList } from './MessageList';
import { StreamingMessage } from './StreamingMessage';
import { Message, AISettings } from './types';
import { useSummaryStore } from '@/stores/Summary';
import { useAutoScroll } from '@/hooks/useAutoScroll';

export const Summary = () => {
    const { content, prompt } = useSummaryStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AISettings | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const initializationRef = useRef(false);
    const messagesRef = useAutoScroll([messages, streamingMessage]);

    const handleAIInteraction = async (message: string, isInitial = false) => {
        if (!settings) {
            console.error('Settings not available');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Add user message immediately
            if (isInitial) {
                setMessages([{ role: 'user', content: message }]);
            } else {
                setMessages(prev => [...prev, { role: 'user', content: message }]);
            }

            // Create update handler for streaming response
            const handleUpdate = (streamContent: string) => {
                setStreamingMessage(streamContent);
            };

            // Get streaming response
            const response = await handleStreamingResponse(
                settings,
                message,
                handleUpdate
            );

            // Add completed response to messages
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setStreamingMessage(''); // Clear streaming message

        } catch (error) {
            setError('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize settings first
    useEffect(() => {
        const initializeSettings = async () => {
            try {
                const aiSettings = await api.getAiSettings();
                setSettings(aiSettings);
            } catch (error) {
                setError('Failed to initialize settings');
            }
        };

        initializeSettings();
    }, []);

    // Initialize the summary after settings are available
    useEffect(() => {
        const initializeSummary = async () => {
            if (!settings || initializationRef.current) return;
            initializationRef.current = true;

            try {
                const initialMessage = `${prompt}\n\n${content}`;
                await handleAIInteraction(initialMessage, true);
            } catch (error) {
                setError('error');
            }
        };

        initializeSummary();
    }, [settings, content]);

    // Handle sending new messages
    const handleSendMessage = async () => {
        if (!chatInputRef.current?.value.trim()) {
            return;
        }

        const message = chatInputRef.current.value;
        chatInputRef.current.value = '';

        await handleAIInteraction(message);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!settings) {
        return (
            <div className="summary-content">
                <div className="loading-container">
                    <div className="neon-loader">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="summary-content">
            <div className="model-label">
                <span className="glow text">Model: {settings.model}</span>
            </div>
            <div className="main-content">
                <div id="chat-container" className="chat-container" role="log" aria-live="polite">
                    <div
                        ref={messagesRef}
                        className="chat-messages"
                    >
                        <MessageList messages={messages} />
                        {streamingMessage && <StreamingMessage content={streamingMessage} />}
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
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about the content..." />
                        <div className="token-display"></div>
                        <div className="button-group">
                            <Link href="/"><button className="btn">← Back</button></Link>
                            <button
                                id="send-message"
                                className="btn"
                                onClick={handleSendMessage}
                                disabled={isLoading} >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
