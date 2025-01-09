import { create } from 'zustand';
import { storage } from '@/utils/storage';

interface SummaryState {
    content: string;
    prompt: string;
    enableChunking: boolean;
    setContent: (content: string) => void;
    setPrompt: (prompt: string) => void;
    setEnableChunking: (enabled: boolean) => Promise<void>;
    initializeChunkSetting: () => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set) => ({
    content: '',
    prompt: '',
    enableChunking: false,

    setContent: (content: string) => set({ content }),
    setPrompt: (prompt: string) => set({ prompt }),

    setEnableChunking: async (enabled: boolean) => {
        try {
            await storage.sync.set({ enableChunking: enabled });
            set({ enableChunking: enabled });
        } catch (error) {
            console.error('Error saving chunk setting:', error);
            // Revert state if save fails
            set((state) => ({ enableChunking: !state.enableChunking }));
        }
    },

    initializeChunkSetting: async () => {
        try {
            const result = await storage.sync.get('enableChunking');
            set({ enableChunking: result.enableChunking ?? false });
        } catch (error) {
            console.error('Error loading chunk setting:', error);
            set({ enableChunking: false });
        }
    }
}));

// Initialize chunk setting when store is first imported
useSummaryStore.getState().initializeChunkSetting();
