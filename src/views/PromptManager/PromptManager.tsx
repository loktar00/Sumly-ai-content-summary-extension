import { Link } from "wouter";
import { useState, useEffect } from "react";
import { getPrompts, savePrompt } from "@/utils/prompts";
import { PromptItem } from "./PromptItem";
import { Prompt } from "@/utils/prompts";

export const PromptManager = () => {

    const [pattern, setPattern] = useState<string>('');
    const [prompt, setPrompt] = useState<string>('');

    const handleSavePrompt = () => {
        savePrompt(pattern, prompt);
    };

    const [prompts, setPrompts] = useState<Prompt[]>([]);

    useEffect(() => {
        getPrompts().then(setPrompts);
    }, []);

    return (
        <div className="prompt-manager">
            <Link to="/">
                <button id="back-button" className="btn back-btn">← Back</button>
            </Link>
            <div className="prompt-form">
                <div className="prompt-url-input">
                    <input type="text" id="prompt-pattern" placeholder="URL pattern (e.g., reddit.com/user)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                    <button id="use-current-url" className="btn">Get URL</button>
                </div>
                <textarea id="prompt-content" rows={6} placeholder="Enter prompt for this URL pattern" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
                <button id="save-prompt" className="btn" onClick={handleSavePrompt}>Save</button>
            </div>
            <div className="saved-prompts">
                <h3>Saved Prompts</h3>
                <div id="prompts-list">
                    {prompts.map((prompt) => (
                        <PromptItem key={prompt.id} {...prompt} />
                    ))}
                </div>
            </div>
        </div>
    );
};