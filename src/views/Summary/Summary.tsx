import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Link } from 'wouter';
import { handleStreamingResponse, updateTokenCount, estimateTokens, chunkAndSummarize } from '@/utils/chat';
import { api } from '@/api/api';
import { MessageList } from './MessageList';
import { StreamingMessage } from './StreamingMessage';
import { Message, AISettings } from './types';
import { useSummaryStore } from '@/stores/Summary';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { Loader } from '@/components/Loader';
import { TokenDisplay } from './TokenDisplay';

export const Summary = () => {
    const { content, prompt, enableChunking } = useSummaryStore();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<AISettings | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [tokenCount, setTokenCount] = useState<number>(0);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const initializationRef = useRef(false);
    const { ref: messagesRef, scrollToBottom } = useAutoScroll([messages, streamingMessage]);
    const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsLoading(false);
            const stoppedByUser = `${streamingMessage} \n\n *Output stopped by user*`;
            setStreamingMessage('');

            // Add streaming message to messages
            setMessages(prev => [...prev, { role: 'assistant', content: stoppedByUser }]);
            scrollToBottom();
        }
    };

    const handleBack = () => {
        handleStop();
    };

    const handleAIInteraction = async (message: string, isInitial = false) => {
        if (!settings) {
            console.error('Settings not available');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            abortControllerRef.current = new AbortController();

            // Add user message immediately and update token count
            let newMessages: Message[];
            if (isInitial) {
                newMessages = [{ role: 'user', content: message }];
                setMessages(newMessages);
            } else {
                newMessages = [...messages, { role: 'user', content: message }];
                setMessages(newMessages);
            }

            setTimeout(() => scrollToBottom(), 100); // Force scroll after adding user message

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
                newMessages,
                null,
                abortControllerRef.current
            );

            // Add completed response to messages and update token count
            setMessages(prev => {
                const updatedMessages: Message[] = [...prev, { role: 'assistant', content: response }];
                setTokenCount(updateTokenCount(updatedMessages));
                setTimeout(() => scrollToBottom(), 100); // Force scroll after AI response with slight delay
                return updatedMessages;
            });
            setStreamingMessage('');

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Handle abort gracefully
                return;
            }
            setError('error');
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
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
            abortControllerRef.current = new AbortController();

            try {
                let initialMessage = `${prompt}\n\n${content}`;

                // Only process chunks if content is too large
                const estimatedTokens = estimateTokens(content);
                const systemPromptTokens = estimateTokens(prompt);
                const messageFormatTokens = 8;
                const safetyMargin = 50;
                const totalOverhead = systemPromptTokens + messageFormatTokens + safetyMargin;

                if (estimatedTokens + totalOverhead > settings.numCtx && enableChunking) {
                    setTokenCount(estimatedTokens + totalOverhead);
                    setChunkProgress({ current: 0, total: 0, message: 'Analyzing content size...' });

                    initialMessage = await chunkAndSummarize(
                        content,
                        settings.numCtx,
                        settings,
                        prompt,
                        (progress) => {
                            setChunkProgress({
                                current: progress.currentChunk,
                                total: progress.totalChunks,
                                message: progress.message
                            });
                        },
                        (streamContent) => {
                            setStreamingMessage(streamContent);
                        },
                        abortControllerRef.current
                    );
                }

                await handleAIInteraction(`${prompt}\n\n${initialMessage}`, true);
                setChunkProgress(null);
            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                setError('error');
            } finally {
                abortControllerRef.current = null;
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

                    {chunkProgress && (
                        <div className="chunk-progress">
                            <div className="message system-message">
                                <div>{chunkProgress.message}</div>
                                {chunkProgress.total > 0 && (
                                    <div>Progress: {chunkProgress.current} / {chunkProgress.total}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div id="chat-loading" className="chat-loading">
                            <Loader />
                            <TokenDisplay tokenCount={Number(tokenCount)} max={Number(settings?.numCtx)} />
                            <div className="button-group loading-controls">
                                <Link href="/" onClick={handleBack}><button className="btn">← Back</button></Link>
                                <button className="btn danger-btn" onClick={handleStop}>Stop</button>
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
