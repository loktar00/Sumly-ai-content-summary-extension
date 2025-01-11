import { storage } from "./storage";

export type Prompt = {
    id: string;
    name: string;
    content: string;
    pattern: string;
    isDefault?: boolean;
    selector?: string; // CSS selector for the element to get content from
};

interface StorageData {
    savedPrompts?: Record<string, {
        content: string;
        isDefault: boolean;
        id: string;
        name: string;
        pattern: string;
        selector?: string; // CSS selector for the element to get content from
    }>;
}

// Save a prompt
export async function savePrompt(prompt: Prompt) {
    const result = await storage.sync.get('savedPrompts') as StorageData;
    const savedPrompts = result.savedPrompts || {};

    // If making this prompt default, remove default flag from others
    if (prompt.isDefault) {
        Object.keys(savedPrompts).forEach(key => {
            if (savedPrompts[key].isDefault) {
                savedPrompts[key] = {
                    ...savedPrompts[key],
                    isDefault: false
                };
            }
        });
    }

    // Clean pattern and save prompt
    const cleanPattern = prompt.pattern.replace(/^www\./, '');
    savedPrompts[cleanPattern] = {
        id: prompt.id,
        name: prompt.name,
        content: prompt.content,
        pattern: cleanPattern,
        isDefault: prompt.isDefault || false,
        selector: prompt.selector || ''
    };

    await storage.sync.set({ savedPrompts });
}

// Get all prompts including system default
export async function getPrompts(): Promise<Prompt[]> {
    const result = await storage.sync.get('savedPrompts') as StorageData;
    const savedPrompts = result.savedPrompts || {};

    // Convert saved prompts to array format
    const prompts = Object.entries(savedPrompts).map(([pattern, prompt]) => ({
        id: pattern,
        name: pattern,
        content: prompt.content,
        pattern,
        isDefault: prompt.isDefault,
        selector: prompt.selector
    }));


    return prompts;
}

// Get the current default prompt (either user-set or system)
export async function getDefaultPrompt(): Promise<Prompt> {
    const prompts = await getPrompts();
    return prompts.find(prompt => prompt.isDefault) as Prompt;
}