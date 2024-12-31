// State management
const state = {
    models: []
};

// Elements
const elements = {
    modelSelect: document.getElementById("aiModel"),
    modelStatus: document.getElementById("model-status"),
    statusText: document.getElementById("status"),
    aiUrlInput: document.getElementById("aiUrl"),
    systemPromptInput: document.getElementById("systemPrompt"),
    saveButton: document.getElementById("save"),
    fetchModelsButton: document.getElementById("fetch-models")
};

// Utility functions
const utils = {
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    },

    async saveSettings() {
        const settings = {
            aiUrl: elements.aiUrlInput.value,
            aiModel: elements.modelSelect.value,
            systemPrompt: elements.systemPromptInput.value
        };

        await chrome.storage.sync.set(settings);
        this.showSaveConfirmation();
    },

    showSaveConfirmation() {
        elements.statusText.textContent = "Settings saved!";
        setTimeout(() => {
            elements.statusText.textContent = "";
        }, CONSTANTS.DELAYS.SAVE_MESSAGE);
    }
};

// API interactions
const api = {
    async fetchModels(baseUrl) {
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            const data = await response.json();

            if (!data?.models?.length) {
                this.showModelError("No models found on the server");
                return false;
            }

            this.updateModelsList(data.models);
            return true;
        } catch (error) {
            this.showModelError("Failed to fetch models. Check the server URL.", error.message);
            return false;
        }
    },

    updateModelsList(models) {
        elements.modelSelect.innerHTML = '';
        state.models = models;

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = `${model.name} (${utils.formatSize(model.size)})`;
            elements.modelSelect.appendChild(option);
        });

        elements.modelSelect.disabled = false;
        elements.modelStatus.textContent = `${models.length} models available`;
        elements.modelStatus.classList.remove('error-text');
    },

    showModelError(message, details = '') {
        console.error('Model error:', message, details);
        elements.modelSelect.innerHTML = '<option value="">No models found</option>';
        elements.modelStatus.textContent = message;
        elements.modelStatus.classList.add('error-text');
    }
};

// Event handlers
const handlers = {
    async handleSave() {
        await utils.saveSettings();
    },

    async handleFetchModels() {
        const aiUrl = elements.aiUrlInput.value;

        if (!aiUrl) {
            alert("Please enter the Ollama base URL first");
            return;
        }

        elements.modelStatus.textContent = "Fetching models...";
        await api.fetchModels(aiUrl);
    }
};

// Initialization
async function initializeSettings() {
    const settings = await chrome.storage.sync.get([
        "aiUrl",
        "aiModel",
        "systemPrompt"
    ]);

    // Set default values or stored values
    elements.aiUrlInput.value = settings.aiUrl || CONSTANTS.API.DEFAULT_AI_URL;
    elements.systemPromptInput.value = settings.systemPrompt || CONSTANTS.API.DEFAULT_SYSTEM_PROMPT;

    // Fetch and set models
    if (settings.aiUrl) {
        await api.fetchModels(settings.aiUrl);
        if (settings.aiModel) {
            elements.modelSelect.value = settings.aiModel;
        }
    }
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    initializeSettings();
    elements.saveButton.addEventListener("click", handlers.handleSave);
    elements.fetchModelsButton.addEventListener("click", handlers.handleFetchModels);
});
