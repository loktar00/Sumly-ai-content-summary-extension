export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AISettings {
    url: string;
    model: string;
    numCtx: number;
}