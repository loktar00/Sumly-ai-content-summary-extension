import { useState, useRef, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { PromptSelector } from "./PromptSelector";
import { useSummaryStore } from "@/stores/Summary";
import { getCurrentUrl, getVideoTitle } from "@/utils/url";
import { fetchWebpage, getCurrentVideoId, fetchYouTubeTranscript } from "@/utils/content";
import { PathSelector } from '@/components/PathSelector';
import { cleanContent } from "@/utils/content";

export const Home = () =>  {
    const [selectedPromptContent, setSelectedPromptContent] = useState<string>('');
    const [, setLocation] = useLocation();
    const { setContent, setPrompt, enableChunking, setEnableChunking } = useSummaryStore();
    const transcriptAreaRef = useRef<HTMLTextAreaElement>(null);

    const handlePromptChange = (content: string) => {
        setSelectedPromptContent(content);
        setPrompt(content);
    };

    const handleFetchWebpage = async () => {
        const content = await fetchWebpage();
        if (content && transcriptAreaRef.current) {
            transcriptAreaRef.current.value = content;
            setContent(content);
        }
    };

    const handleFetchTranscript = async () => {
        const videoId = await getCurrentVideoId();

        if (!videoId) {
            alert("Could not determine video ID. Please ensure you're on a YouTube video page.");
            return;
        }

        if (transcriptAreaRef.current) {
            transcriptAreaRef.current.value = "Fetching transcript...";
        }

        try {
            const transcript = await fetchYouTubeTranscript(videoId);
            if (transcript && transcriptAreaRef.current) {
                transcriptAreaRef.current.value = transcript;
                setContent(transcript);
            }
        } catch (error: unknown) {
            if (transcriptAreaRef.current) {
                transcriptAreaRef.current.value = `Error fetching transcript: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
    }

    const handleSummarize = async () => {
        let userContent = transcriptAreaRef.current?.value.trim();

        // Check if we're on YouTube
        const currentUrl = await getCurrentUrl();
        const isYouTube = currentUrl?.includes('youtube.com/watch');

        if (!userContent) {
            if (isYouTube) {
                await handleFetchTranscript();
            } else {
                await handleFetchWebpage();
            }

            userContent = transcriptAreaRef.current?.value;
        }

        const pageTitle = await getVideoTitle() || document.title || "Content";


        setContent(`${pageTitle}\n${userContent}`);
        setLocation('/summary');
    };

    const handleCopyToClipboard = async () => {
        if (transcriptAreaRef.current) {
            try {
                await navigator.clipboard.writeText(transcriptAreaRef.current.value);
                alert("Transcript copied to clipboard!");
            } catch (error) {
                alert(`Failed to copy text to clipboard. ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }

    const handleChunkSettingChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEnableChunking(e.target.checked);
    };

    const handlePathSelected = async (selector: string) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) return;

            // Get the text content using the selector
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (selector: string) => {
                    const element = document.querySelector(selector);
                    return element?.textContent?.trim() || '';
                },
                args: [selector]
            });

            if (transcriptAreaRef.current) {
                transcriptAreaRef.current.value = cleanContent(result || '');
                setContent(cleanContent(result || ''));
            }
        } catch (error) {
            console.error('Error getting element content:', error);
        }
    };

    return (
        <>
            <PromptSelector onSelect={handlePromptChange}/>
            <textarea
                id="system-prompt"
                rows={6}
                cols={50}
                placeholder="System Prompt"
                value={selectedPromptContent}
                onChange={(e) => handlePromptChange(e.target.value)}
            />
            <div className="summarize-controls">
                <button
                    id="summarize-transcript"
                    className="btn ai-btn"
                    onClick={handleSummarize}>
                    Summarize Page with AI
                </button>
                <div className="chunk-control">
                    <label>
                        <input type="checkbox" id="enable-chunking" defaultChecked={enableChunking} onChange={handleChunkSettingChange} />
                        <span>Auto-chunk large content</span>
                    </label>
                </div>
            </div>
            <textarea
                ref={transcriptAreaRef}
                id="transcript-area"
                rows={5}
                cols={50}
                placeholder="Content will appear here..."
            />
            <div className="button-group source-buttons">
                <PathSelector onPathSelected={handlePathSelected} />
                <button id="fetch-webpage" className="btn" onClick={handleFetchWebpage}>
                    Get Page Content
                </button>
                <button id="fetch-current-transcript" className="btn" onClick={handleFetchTranscript}>
                    Get Transcript
                </button>
                <button id="copy-to-clipboard" className="btn" onClick={handleCopyToClipboard}>
                    Copy to Clipboard
                </button>
            </div>
        </>
    );
};