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
        console.log(prompts, selectedPrompt);
        setSelectedPrompt(foundPrompt || null);

        if (foundPrompt) {
            onSelect(foundPrompt.content);
        }
    };

    useEffect(() => {
        const loadBestMatch = async () => {
            // Find best matching pattern and select it in dropdown
            const bestMatch = await findBestMatchForUrl(
                prompts.map(prompt => prompt.pattern)
            );

            if (bestMatch) {
                handlePromptChange({ target: { value: bestMatch } } as ChangeEvent<HTMLSelectElement>);
            } else {
                handlePromptChange({ target: { value: 'default' } } as ChangeEvent<HTMLSelectElement>);
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
            <select id="prompt-selector" defaultValue="default" onChange={handlePromptChange} value={selectedPrompt?.pattern}>
                {prompts.map((prompt) =>
                    <option key={prompt.id} value={prompt.isDefault ? 'default' : prompt.pattern}>
                        {prompt.name}
                    </option>
                )}
            </select>
        </div>
    );
};