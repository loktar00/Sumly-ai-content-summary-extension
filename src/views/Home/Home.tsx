import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PromptSelector } from "./PromptSelector";
import { getDefaultPrompt } from "@/utils/prompts";

export const Home = () =>  {
    const [selectedPromptContent, setSelectedPromptContent] = useState<string>('');
    const [pageTitle, setPageTitle] = useState<string>('');
    const [, setLocation] = useLocation();

    // Load default prompt on component mount
    useEffect(() => {
        const loadDefaultPrompt = async () => {
            const defaultPrompt = await getDefaultPrompt();
            setSelectedPromptContent(defaultPrompt.content);
        };

        loadDefaultPrompt();
    }, []);

    const handlePromptChange = (content: string) => {
        setSelectedPromptContent(content);
    };

    const handleSummarize = () => {
        // Get content from textarea
        const transcriptArea = document.getElementById('transcript-area') as HTMLTextAreaElement;
        const content = transcriptArea?.value || '';

        // Get page title (you might want to get this from the actual page)
        setPageTitle('Current Page');

        // Navigate to summary view with state
        setLocation('/summary', {
            state: {
                content,
                pageTitle,
                systemPrompt: selectedPromptContent,
            }
        });
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
                onChange={(e) => setSelectedPromptContent(e.target.value)}
            />
            <div className="summarize-controls">
                <button
                    id="summarize-transcript"
                    className="btn ai-btn"
                    onClick={handleSummarize}
                >
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
                id="transcript-area"
                rows={5}
                cols={50}
                placeholder="Content will appear here..."
            />
            <div className="button-group source-buttons">
                <button id="fetch-webpage" className="btn">Get Page Content</button>
                <button id="fetch-current-transcript" className="btn">Get Transcript</button>
                <button id="copy-to-clipboard" className="btn">Copy to Clipboard</button>
            </div>
        </>
    );
};