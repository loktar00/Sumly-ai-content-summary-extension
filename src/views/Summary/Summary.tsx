import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { handleStreamingResponse, updateTokenCount, estimateTokens } from '@/utils/chat';
import { api } from '@/api/api';
import { MessageList } from './MessageList';
import { StreamingMessage } from './StreamingMessage';
import { Message, AISettings } from './types';
import { useSummaryStore } from '@/stores/Summary';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Loader } from '@/components/Loader';
import { TokenDisplay } from './TokenDisplay';

export const Summary = () => {
    const { content, prompt } = useSummaryStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AISettings | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [tokenCount, setTokenCount] = useState<Number>(0);
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

            // Add user message immediately and update token count
            let newMessages: Message[];
            if (isInitial) {
                newMessages = [{ role: 'user', content: message }];
                setMessages(newMessages);
            } else {
                newMessages = [...messages, { role: 'user', content: message }];
                setMessages(newMessages);
            }

            setTokenCount(updateTokenCount(newMessages));

            // Create update handler for streaming response
            const handleUpdate = (streamContent: string) => {
                setStreamingMessage(streamContent);
            };

            // Get streaming response with conversation history
            const response = await handleStreamingResponse(
                settings,
                message,
                handleUpdate,
                newMessages
            );

            // Add completed response to messages and update token count
            setMessages(prev => {
                const updatedMessages: Message[] = [...prev, { role: 'assistant', content: response }];
                setTokenCount(updateTokenCount(updatedMessages));
                return updatedMessages;
            });
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
            if (!settings || initializationRef.current) {
                return;
            }

            initializationRef.current = true;

            try {
                let initialMessage = `${prompt}\n\n${content}`;

                // Only process chunks if enabled and content is too large
                if (true) {
                    const estimatedTokens = estimateTokens(content);
                    const systemPromptTokens = estimateTokens(prompt);
                    const messageFormatTokens = 8;
                    const safetyMargin = 50;
                    const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;

                    if (estimatedTokens + totalOverhead > settings.numCtx) {
                        initialMessage = await chunkAndSummarize(
                            content,
                            settings.numCtx,
                            settings,
                            prompt
                        );
                    }
                }


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

    return (
        <div className="summary-content">
            <div className="model-label">
                <span className="glow text">Model: {settings?.model}</span>
            </div>
            <div className="main-content">
                <div id="chat-container" className="chat-container" role="log" aria-live="polite">
                    <div
                        ref={messagesRef}
                        className="chat-messages">
                        <MessageList messages={messages} />
                        {streamingMessage && <StreamingMessage content={streamingMessage} />}
                    </div>

                    {isLoading && (
                        <div id="chat-loading" className="chat-loading">
                            <Loader />
                            <TokenDisplay tokenCount={Number(tokenCount)} max={Number(settings?.numCtx)} />
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
                        <TokenDisplay tokenCount={Number(tokenCount)} max={Number(settings?.numCtx)} />
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
