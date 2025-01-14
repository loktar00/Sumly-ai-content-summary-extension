export interface ModelConfig {
    provider: string;
    name: string;
    url: string;
    api_endpoint: string;
    model: string;
    num_ctx?: number;
    model_selection?: boolean;
    api_key?: string;
    temperature?: number;
    max_tokens?: number;
}

export const modelProviders = {
    "Ollama": {
        "provider": "Ollama",
        "name": "Ollama",
        "url": "http://localhost:11434",
        "api_endpoint": "/api/chat",
        "model": "llama3.1",
        "temperature": 1.0,
        "num_ctx": 8000,
        "model_selection": true
    },
    "Deepseek": {
        "provider": "Deepseek",
        "name": "Deepseek",
        "url": "https://api.deepseek.com",
        "api_endpoint": "chat/completions",
        "model": "deepseek-chat",
        "api_key": "",
        "temperature": 1.0,
        "max_tokens": 4000
    }
}