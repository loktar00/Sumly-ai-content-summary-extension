export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AISettings {
    url: string;
    model: string;
    num_ctx: number;
}