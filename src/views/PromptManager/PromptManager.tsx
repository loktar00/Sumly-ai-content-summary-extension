import { Link } from "wouter";
import { useState } from "react";
import { PromptItem } from "./PromptItem";
import { usePromptManagerStore } from "@/stores/SavedPrompts";
import { getCurrentUrl } from "@/utils/url";

export const PromptManager = () => {

    const { prompts, addPrompt } = usePromptManagerStore();
    const [pattern, setPattern] = useState<string>('');
    const [prompt, setPrompt] = useState<string>('');

    const handleSavePrompt = () => {
        const newPrompt = {
            pattern,
            name: pattern,
            content: prompt,
            isDefault: false,
            id: pattern,
        };

        addPrompt(newPrompt);
    };

    const handleUseCurrentUrl = async () => {
        const currentUrl = await getCurrentUrl();
        if (currentUrl) {
            setPattern(currentUrl);
        }
    };

    const handleEditPrompt = (pattern: string) => {
        const prompt = prompts.find(p => p.pattern === pattern);
        if (prompt) {
            setPattern(prompt.pattern);
            setPrompt(prompt.content);
        }
    };

    return (
        <div className="prompt-manager">
            <Link to="/">
                <button id="back-button" className="btn back-btn">← Back</button>
            </Link>
            <div className="prompt-form">
                <div className="prompt-url-input">
                    <input type="text" id="prompt-pattern" placeholder="URL pattern (e.g., reddit.com/user)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                    <button id="use-current-url" className="btn" onClick={handleUseCurrentUrl}>Get URL</button>
                </div>
                <textarea id="prompt-content" rows={6} placeholder="Enter prompt for this URL pattern" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
                <button id="save-prompt" className="btn" onClick={handleSavePrompt}>Save</button>
            </div>
            <div className="saved-prompts">
                <h3>Saved Prompts</h3>
                <div id="prompts-list">
                    {prompts.map((prompt) => (
                        <PromptItem key={prompt.id} {...prompt} onEdit={handleEditPrompt} />
                    ))}
                </div>
            </div>
        </div>
    );
};