export const modelProviders = {
    "Ollama": {
        "name": "Ollama",
        "url": "http://localhost:11434",
        "api_endpoint": "/api/chat",
        "model": "llama3.1",
        "num_ctx": 8000,
        "model_selection": true
    },
    "Deepseek": {
        "name": "Deepseek",
        "url": "https://api.deepseek.com",
        "api_endpoint": "chat/completions",
        "model": "deepseek-chat",
        "api_key": ""
    }
}