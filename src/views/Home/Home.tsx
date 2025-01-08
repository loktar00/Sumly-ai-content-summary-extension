import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { PromptSelector } from "./PromptSelector";
import { getDefaultPrompt } from "@/utils/prompts";
import { useSummaryStore } from "@/stores/Summary";
import { fetchWebpage, getCurrentVideoId, fetchYouTubeTranscript } from "@/utils/content";

export const Home = () =>  {
    const [selectedPromptContent, setSelectedPromptContent] = useState<string>('');
    const [, setPageTitle] = useState<string>('');
    const [, setLocation] = useLocation();
    const { setContent, setPrompt } = useSummaryStore();
    const transcriptAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const loadDefaultPrompt = async () => {
            const defaultPrompt = await getDefaultPrompt();
            setSelectedPromptContent(defaultPrompt.content);
            setPrompt(defaultPrompt.content);
        };

        loadDefaultPrompt();
    }, []);

    const handlePromptChange = (content: string) => {
        setSelectedPromptContent(content);
        setPrompt(content);
    };

    const handleSummarize = () => {
        const userContent = transcriptAreaRef.current?.value || '';
        setContent(userContent);

        setPageTitle('Current Page');
        setLocation('/summary');
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

    return (
        <>
            <PromptSelector onSelect={handlePromptChange}/>
            <textarea
                id="system-prompt"
                rows={6}
                cols={50}
                placeholder="System Prompt"
                value={selectedPromptContent}
                onChange={(e) => setSelectedPromptContent(e.target.value)}
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
                        <input type="checkbox" id="enable-chunking" defaultChecked />
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
                <button id="fetch-webpage" className="btn" onClick={handleFetchWebpage}>Get Page Content</button>
                <button id="fetch-current-transcript" className="btn" onClick={handleFetchTranscript}>Get Transcript</button>
                <button id="copy-to-clipboard" className="btn">Copy to Clipboard</button>
            </div>
        </>
    );
};