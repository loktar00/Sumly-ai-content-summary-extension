import { CONSTANTS } from './constants.js';
import { api } from './api.js';
import { utils } from './utils.js';
import { state } from './state.js';
import { promptManager } from './prompt-manager.js';

export const ui = {
    toggleChatElements(loading = false) {
        const chatInputContainer = document.querySelector('.chat-input-container');
        const chatLoading = document.querySelector('#chat-loading');
        const loadingControls = document.querySelector('.loading-controls');

        if (loading) {
            chatInputContainer.classList.add('hidden');
            chatLoading.classList.remove('hidden');
            if (loadingControls) {
                loadingControls.classList.remove('hidden');
            }
        } else {
            chatInputContainer.classList.remove('hidden');
            chatLoading.classList.add('hidden');

            if (loadingControls) {
                loadingControls.classList.add('hidden');
            }
        }
    },

    autoScroll(force = false) {
        const element = document.getElementById("chat-messages");
        const isUserScrolledUp = element.scrollHeight - element.clientHeight - element.scrollTop > CONSTANTS.UI.SCROLL_TOLERANCE;

        if (!isUserScrolledUp || force) {
            element.scrollTop = element.scrollHeight;
        }
    },

    async loadSystemPrompt() {
        const systemPromptArea = document.getElementById('system-prompt');
        if (systemPromptArea) {
            const systemPrompt = await api.getSystemPrompt();
            systemPromptArea.value = systemPrompt;

            // Add event listener to save changes
            systemPromptArea.addEventListener('change', async () => {
                await chrome.storage.sync.set({
                    systemPrompt: systemPromptArea.value
                });
            });
        }
    },

    async loadPromptSelector() {
        const selector = document.getElementById('prompt-selector');
        const systemPromptArea = document.getElementById('system-prompt');

        if (!selector || !systemPromptArea) {
            return;
        }

        // Get current URL
        const currentUrl = await utils.getCurrentUrl();
        if (!currentUrl) {
            return;
        }

        // Get all saved prompts
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

        // Clear existing options
        selector.innerHTML = '<option value="default">Default System Prompt</option>';

        // Add saved prompts as options, excluding the current default
        Object.entries(savedPrompts)
            .filter(([, promptData]) => !promptData.isDefault) // Filter out the default prompt
            .forEach(([pattern, ]) => {
                const option = document.createElement('option');
                option.value = pattern;
                option.textContent = pattern;
                selector.appendChild(option);
            });

        // Find best matching pattern and select it in dropdown
        const bestMatch = promptManager.findBestMatchForUrl(
            currentUrl,
            Object.keys(savedPrompts)
        );

        if (bestMatch) {
            selector.value = bestMatch;
            systemPromptArea.value = savedPrompts[bestMatch].content;
        } else {
            selector.value = 'default';
            systemPromptArea.value = await api.getSystemPrompt();
        }
    },

    updateTokenCount(container) {
        const tokenDisplay = container.querySelectorAll('.token-display');
        if (!tokenDisplay) {
            return;
        }

        const totalTokens = utils.calculateConversationTokens(state.conversationHistory);
        tokenDisplay.forEach(display => {
            display.textContent = `Total Tokens: ${totalTokens.toLocaleString()} / Context ${state.contextSize.toLocaleString()}`;
        });

        // Add warning class if approaching limit
        tokenDisplay.forEach(display => {
            display.classList.toggle('token-warning',
                totalTokens > state.contextSize * 0.8);
        });
    }

};