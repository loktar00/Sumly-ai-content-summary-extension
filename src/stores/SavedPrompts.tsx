import { create } from 'zustand';
import { Prompt, getPrompts, savePrompt } from '@/utils/prompts';
import { storage } from '@/utils/storage';

interface PromptManagerState {
    prompts: Prompt[];
    isLoading: boolean;
    error: string | null;
    initializePrompts: () => Promise<void>;
    addPrompt: (prompt: Prompt) => Promise<void>;
    deletePrompt: (pattern: string) => Promise<void>;
    setDefaultPrompt: (pattern: string) => Promise<void>;
}

export const usePromptManagerStore = create<PromptManagerState>((set) => ({
    prompts: [],
    isLoading: true,
    error: null,

    initializePrompts: async () => {
        try {
            set({ isLoading: true, error: null });
            const savedPrompts = await getPrompts();
            set({ prompts: savedPrompts, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load prompts',
                isLoading: false
            });
        }
    },

    addPrompt: async (prompt: Prompt) => {
        try {
            await savePrompt(prompt);
            // Refresh prompts after saving
            const savedPrompts = await getPrompts();
            set({ prompts: savedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to save prompt' });
        }
    },

    deletePrompt: async (pattern: string) => {
        try {
            const result = await storage.sync.get('savedPrompts');
            const savedPrompts = result.savedPrompts || {};
            delete savedPrompts[pattern];
            await storage.sync.set({ savedPrompts });

            // Refresh prompts after deletion
            const updatedPrompts = await getPrompts();
            set({ prompts: updatedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to remove prompt' });
        }
    },

    setDefaultPrompt: async (pattern: string) => {
        try {
            const result = await storage.sync.get('savedPrompts');
            const savedPrompts = result.savedPrompts || {};

            // Remove default flag from all prompts
            Object.keys(savedPrompts).forEach(key => {
                if (savedPrompts[key].isDefault) {
                    savedPrompts[key].isDefault = false;
                }
            });

            // Set new default
            if (savedPrompts[pattern]) {
                savedPrompts[pattern].isDefault = true;
            }

            await storage.sync.set({ savedPrompts });

            // Refresh prompts after updating
            const updatedPrompts = await getPrompts();
            set({ prompts: updatedPrompts });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to set default prompt' });
        }
    }
}));

// Initialize prompts when the store is first imported
usePromptManagerStore.getState().initializePrompts();