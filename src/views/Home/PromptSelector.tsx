import { ChangeEvent, useState } from "react";
import { Prompt } from "@/utils/prompts";
import { useEffect } from "react";
import { usePromptManagerStore } from "@/stores/SavedPrompts";
import { findBestMatchForUrl } from "@/utils/url";
import { Loader } from '@/components/Loader';

export const PromptSelector = ({ onSelect }: { onSelect: (content: string) => void }) => {
    const { prompts, isLoading, error } = usePromptManagerStore();
    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

    const handlePromptChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const foundPrompt = prompts.find(prompt => prompt.pattern === e.target.value);
        setSelectedPrompt(foundPrompt || null);

        if (foundPrompt) {
            onSelect(foundPrompt.content);
        }
    };

    useEffect(() => {
        const loadBestMatch = async () => {
            if (prompts.length === 0) return;

            // Find best matching pattern and select it in dropdown
            const bestMatch = await findBestMatchForUrl(
                prompts.map(prompt => prompt.pattern)
            );

            if (bestMatch) {
                handlePromptChange({ target: { value: bestMatch } } as ChangeEvent<HTMLSelectElement>);
            } else {
                // Select first prompt if no match found
                handlePromptChange({ target: { value: prompts[0].pattern } } as ChangeEvent<HTMLSelectElement>);
            }
        };

        loadBestMatch();
    }, [prompts]);

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <div className="error-text">Error loading prompts: {error}</div>;
    }

    return (
        <div className="prompt-selector">
            <select id="prompt-selector" onChange={handlePromptChange} value={selectedPrompt?.pattern}>
                {prompts.map((prompt) =>
                    <option key={prompt.id} value={prompt.pattern}>
                        {prompt.name}
                    </option>
                )}
            </select>
        </div>
    );
};