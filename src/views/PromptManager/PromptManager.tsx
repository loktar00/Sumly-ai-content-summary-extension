import { Link } from "wouter";
import { useState } from "react";
import { PromptItem } from "./PromptItem";
import { usePromptManagerStore } from "@/stores/SavedPrompts";
import { getCurrentUrl } from "@/utils/url";
import { PathSelector } from "@/components/PathSelector";

export const PromptManager = () => {

    const { prompts, addPrompt } = usePromptManagerStore();
    const [pattern, setPattern] = useState<string>('');
    const [prompt, setPrompt] = useState<string>('');
    const [selectedPath, setSelectedPath] = useState<string>('');

    const handleSavePrompt = () => {
        const newPrompt = {
            pattern,
            name: pattern,
            content: prompt,
            isDefault: false,
            id: pattern,
            selector: selectedPath,
        };

        addPrompt(newPrompt);
        setPattern('');
        setPrompt('');
        setSelectedPath('');
    };

    const handleUseCurrentUrl = async () => {
        const currentUrl = await getCurrentUrl();
        if (currentUrl) {
            setPattern(currentUrl);
        }
    };

    const handlePathSelected = (selector: string) => {
        setSelectedPath(selector);
    };

    const handleEditPrompt = (pattern: string) => {
        const prompt = prompts.find(p => p.pattern === pattern);
        if (prompt) {
            setPattern(prompt.pattern);
            setPrompt(prompt.content);
            setSelectedPath(prompt.selector || '');
        }
    };

    return (
        <div className="prompt-manager">
            <Link to="/">
                <button id="back-button" className="btn back-btn">← Back</button>
            </Link>
            <div className="prompt-form">
                <div className="prompt-manager-input-group">
                    <input type="text" id="prompt-pattern" placeholder="URL pattern (e.g., reddit.com/user)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
                    <button id="use-current-url" className="btn" onClick={handleUseCurrentUrl}>Get URL</button>
                </div>
                <div className="prompt-manager-input-group">
                    <input type="text" id="use-selector" placeholder="Target element" value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)} />
                    <PathSelector onPathSelected={handlePathSelected}   />
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