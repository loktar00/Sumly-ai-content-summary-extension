import { create } from 'zustand';

type SummaryState = {
    content: string;
    prompt: string;
    setContent: (content: string) => void;
    setPrompt: (prompt: string) => void;
};

export const useSummaryStore = create<SummaryState>((set) => ({
    content: '',
    prompt: '',
    setContent: (content: string) => set({ content }),
    setPrompt: (prompt: string) => set({ prompt }),
}));
