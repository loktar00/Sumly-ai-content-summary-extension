import { CONSTANTS } from "@/constants";
import { storage } from "./storage";

export type Prompt = {
    id: string;
    name: string;
    content: string;
    pattern: string;
    isDefault: boolean;
}

interface StorageData {
    savedPrompts?: Record<string, {
        content: string;
        isDefault: boolean;
    }>;
}

// Save a prompt
export async function savePrompt(pattern: string, prompt: string, makeDefault = false) {
    const result = await storage.sync.get('savedPrompts') as StorageData;
    const savedPrompts = result.savedPrompts || {};

    // If making this prompt default, remove default flag from others
    if (makeDefault) {
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
    const cleanPattern = pattern.replace(/^www\./, '');
    savedPrompts[cleanPattern] = {
        content: prompt,
        isDefault: makeDefault
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
        isDefault: prompt.isDefault
    }));

    // Check if we have a default prompt
    const hasDefault = prompts.some(prompt => prompt.isDefault) || prompts.length;

    // If no default exists, add the system default
    if (!hasDefault) {
        prompts.unshift({
            id: 'default',
            name: 'Default System Prompt',
            content: CONSTANTS.API.DEFAULT_SYSTEM_PROMPT,
            pattern: '',
            isDefault: true
        });
    }

    return prompts;
}

// Get the current default prompt (either user-set or system)
export async function getDefaultPrompt(): Promise<Prompt> {
    const prompts = await getPrompts();
    return prompts.find(prompt => prompt.isDefault) as Prompt;
}