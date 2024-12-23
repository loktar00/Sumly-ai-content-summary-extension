const DEFAULT_AI_URL = "http://localhost:11434";
const DEFAULT_MODEL = "mistral";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Please provide concise, unbiased summaries and responses. Focus on the main points and key information.";
const SAVE_MESSAGE_DURATION = 2000;

const utils = {
    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) {
            return '0 B';
        }

        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
};

const elements = {
    modelSelect: document.getElementById("aiModel"),
    modelStatus: document.getElementById("model-status"),
    statusText: document.getElementById("status")
};

const api = {
    async fetchModels(baseUrl) {
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            const data = await response.json();

            elements.modelSelect.innerHTML = '';

            if (data?.models?.length) {
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = `${model.name} (${utils.formatSize(model.size)})`;
                    elements.modelSelect.appendChild(option);
                });

                elements.modelSelect.disabled = false;
                elements.modelStatus.textContent = `${data.models.length} models available`;
                elements.modelStatus.classList.remove('error-text');
                return true;
            }

            this.showModelError("No models found on the server");
            return false;
        } catch (error) {
            this.showModelError("Failed to fetch models. Check the server URL.");
            return false;
        }
    },

    showModelError(message) {
        elements.modelSelect.innerHTML = '<option value="">No models found</option>';
        elements.modelStatus.textContent = message;
        elements.modelStatus.classList.add('error-text');
    }
};

const handlers = {
    async handleSave() {
        const settings = {
            apiUrl: document.getElementById("apiUrl").value,
            aiUrl: document.getElementById("aiUrl").value,
            aiModel: elements.modelSelect.value,
            systemPrompt: document.getElementById("systemPrompt").value
        };

        await chrome.storage.sync.set(settings);
        this.showSaveConfirmation();
    },

    showSaveConfirmation() {
        elements.statusText.textContent = "Settings saved!";
        setTimeout(() => {
            elements.statusText.textContent = "";
        }, SAVE_MESSAGE_DURATION);
    },

    async handleFetchModels() {
        const aiUrl = document.getElementById("aiUrl").value;
        if (!aiUrl) {
            alert("Please enter the Ollama base URL first");
            return;
        }

        elements.modelStatus.textContent = "Fetching models...";
        await api.fetchModels(aiUrl);
    }
};

async function initializeSettings() {
    const settings = await chrome.storage.sync.get([
        "apiUrl",
        "aiUrl",
        "aiModel",
        "systemPrompt"
    ]);

    if (settings.apiUrl) {
        document.getElementById("apiUrl").value = settings.apiUrl;
    }

    if (settings.aiUrl) {
        const aiUrl = settings.aiUrl || DEFAULT_AI_URL;
        document.getElementById("aiUrl").value = aiUrl;
        await api.fetchModels(aiUrl);
    }

    if (settings.aiModel) {
        // Wait for models to load before setting the selected model
        setTimeout(() => {
            elements.modelSelect.value = settings.aiModel || DEFAULT_MODEL;
        }, 500);
    }

    if (settings.systemPrompt) {
        document.getElementById("systemPrompt").value = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    }
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    initializeSettings();
    document.getElementById("save").addEventListener("click", () => handlers.handleSave());
    document.getElementById("fetch-models").addEventListener("click", () => handlers.handleFetchModels());
});
