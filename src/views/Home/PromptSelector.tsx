import { useState, ChangeEvent } from "react";

import { getPrompts, Prompt } from "@/utils/prompts";
import { useEffect } from "react";

export const PromptSelector = ({ onSelect }: { onSelect: (content: string) => void }) => {

    const [prompts, setPrompts] = useState<Prompt[]>([]);

    const handlePromptChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const selectedPrompt = prompts.find(prompt =>
            prompt.isDefault ? e.target.value === 'default' : prompt.id === e.target.value
        );

        if (selectedPrompt) {
            onSelect(selectedPrompt.content);
        }
    };

    useEffect(() => {
        getPrompts().then(setPrompts);
        handlePromptChange({ target: { value: 'default' } } as ChangeEvent<HTMLSelectElement>);
    }, []);

    return (
        <div className="prompt-selector">
            <select id="prompt-selector" defaultValue="default" onChange={handlePromptChange}>
                <option value="default">Default System Prompt</option>
                {prompts.map((prompt) =>
                    <option key={prompt.id} value={prompt.isDefault ? 'default' : prompt.id}>{prompt.name}</option>
                )}
            </select>
        </div>
    );
};