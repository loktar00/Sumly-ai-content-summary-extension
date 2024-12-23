const DEFAULT_AI_URL = "http://localhost:11434";
const DEFAULT_MODEL = "mistral";
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Please provide concise, unbiased responses.";
const CHAT_CHECK_INTERVAL = 500;

const MESSAGES = {
    welcome: `
        <div class="markdown-body message ai-message">
            <h2>Welcome to Your Summaries</h2>
            <p>Select a conversation from the list to view it.</p>
            <p>You can ask questions about any transcript once you select it.</p>
        </div>
    `,
    noConversations: `
        <div class="empty-state">
            <p>No saved conversations yet</p>
        </div>
    `
};

const state = {
    chatHistory: [],
    currentVideoId: null,
    conversations: new Map()
};

const elements = {
    chatMessages: document.getElementById("chat-messages"),
    chatInput: document.getElementById("chat-input"),
    loadingIndicator: document.getElementById("chat-loading"),
    summaryArea: document.getElementById("summary-area"),
    chatContainer: document.getElementById("chat-container"),
    formattedView: document.getElementById("formatted-summary"),
    conversationList: document.getElementById("conversation-list"),
    mainChat: document.getElementById("main-chat")
};

const api = {
    async getAiSettings() {
        const { aiUrl, aiModel } = await chrome.storage.sync.get(["aiUrl", "aiModel"]);
        return {
            url: `${aiUrl || DEFAULT_AI_URL}/api/generate`,
            model: aiModel || DEFAULT_MODEL
        };
    },

    async getSystemPrompt() {
        const { systemPrompt } = await chrome.storage.sync.get(['systemPrompt']);
        return systemPrompt || DEFAULT_SYSTEM_PROMPT;
    }
};

const utils = {
    formatChatHistory(messages) {
        return messages.map(msg =>
            `${msg.role.toUpperCase()}:\n${msg.content}\n\n`
        ).join('');
    },

    async buildPrompt(newMessage, isLibraryView = false) {
        const systemPrompt = await api.getSystemPrompt();
        let prompt = `${systemPrompt}\n\nContext:\n`;

        if (isLibraryView && state.currentTranscript) {
            prompt += `Here is the transcript for context:\n${state.currentTranscript}\n\n`;
            prompt += `Human: ${newMessage}\nAssistant:`;
        } else {
            state.chatHistory.forEach(msg => {
                const prefix = msg.role === 'user' ? 'Human: ' : 'Assistant: ';
                prompt += `${prefix}${msg.content}\n`;
            });
            prompt += `\nHuman: ${newMessage}\nAssistant:`;
        }

        return prompt;
    },

    areConversationsEqual(map1, map2) {
        if (map1.size !== map2.size) return false;
        for (const [key, val1] of map1) {
            const val2 = map2.get(key);
            if (!val2 || val1.lastUpdated !== val2.lastUpdated) return false;
        }
        return true;
    }
};

const chat = {
    async processStream(reader, messageDiv) {
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            fullResponse += json.response;
                            messageDiv.innerHTML = markdownToHtml(fullResponse);
                            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }
                    } catch (e) {
                        console.warn('Failed to parse chunk:', line, e.message);
                    }
                }
            }
        } catch (error) {
            throw new Error(`Stream processing failed: ${error.message}`);
        }

        return fullResponse;
    },

    async sendMessage(message, isInitialSummary = false) {
        const aiSettings = await api.getAiSettings();
        elements.loadingIndicator.style.display = "block";
        elements.chatInput.parentElement.style.display = "none";

        try {
            const isLibraryView = new URLSearchParams(window.location.search).get('view') === 'library';
            const prompt = isInitialSummary ?
                message :
                await utils.buildPrompt(message, isLibraryView);

            const response = await fetch(aiSettings.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiSettings.model,
                    prompt,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = 'markdown-body message ai-message streaming';
            elements.chatMessages.appendChild(messageDiv);

            const fullResponse = await this.processStream(response.body.getReader(), messageDiv);
            messageDiv.classList.remove('streaming');

            if (!isInitialSummary) {
                await this.updateChatHistory('ai', fullResponse);
            } else {
                const { initialTranscript } = await chrome.storage.local.get('initialTranscript');
                state.chatHistory = [
                    { role: 'user', content: initialTranscript },
                    { role: 'ai', content: fullResponse }
                ];
                await storage.saveConversation();
            }
        } catch (error) {
            this.showError(`Failed to get response from AI. Details: ${error.message}`);
        } finally {
            elements.loadingIndicator.style.display = "none";
            elements.chatInput.parentElement.style.display = "flex";
            elements.chatInput.focus();
        }
    },

    async updateChatHistory(role, content) {
        state.chatHistory.push({ role, content });
        await storage.saveConversation();
    },

    showError(error) {
        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = `<div class="markdown-body message error-message">${error}</div>`;
        }
        elements.chatContainer.style.display = "flex";
    }
};

const handlers = {
    async handleSendMessage() {
        const message = elements.chatInput.value.trim();
        if (!message) return;

        await chat.updateChatHistory('user', message);
        elements.chatInput.value = '';
        await chat.sendMessage(message);
    },

    handleEnterKey(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            this.handleSendMessage();
        }
    },
};

const storage = {
    async saveConversation() {
        const { currentVideo } = await chrome.storage.local.get('currentVideo');
        if (currentVideo?.id) {
            const conversations = await this.getAllConversations();
            conversations.set(currentVideo.id, {
                title: currentVideo.title,
                history: state.chatHistory,
                transcript: state.chatHistory[0]?.content || '',
                lastUpdated: Date.now()
            });
            await chrome.storage.local.set({ conversations: Array.from(conversations) });
        }
    },

    async getAllConversations() {
        const { conversations } = await chrome.storage.local.get('conversations');
        return new Map(conversations || []);
    },

    async loadConversation(videoId) {
        const conversations = await this.getAllConversations();
        const conversation = conversations.get(videoId);
        if (conversation) {
            state.chatHistory = conversation.history;
            state.currentVideoId = videoId;
            state.currentTranscript = conversation.transcript;
            ui.showChatInput(true);
            renderConversation();
            renderConversationList(videoId);
        }
    },

    async deleteConversation(videoId) {
        const conversations = await this.getAllConversations();
        conversations.delete(videoId);

        await chrome.storage.local.set({ conversations: Array.from(conversations) });
        state.conversations = conversations;

        if (videoId === state.currentVideoId) {
            ui.resetState();
            ui.showWelcomeMessage();
            ui.showChatInput(false);
        }

        renderConversationList();
    }
};

const ui = {
    toggleVisibility(element, show) {
        if (show === undefined) {
            element.classList.toggle('hidden');
        } else {
            element.classList.toggle('hidden', !show);
        }
    },

    showLoading(show = true) {
        this.toggleVisibility(elements.loadingIndicator, show);
    },

    showChatContainer(show = true) {
        this.toggleVisibility(elements.chatContainer, show);
    },

    showChatInput(show = true) {
        this.toggleVisibility(elements.chatInput.parentElement, show);
    },

    showWelcomeMessage() {
        elements.chatMessages.innerHTML = MESSAGES.welcome;
    },

    clearChatMessages() {
        elements.chatMessages.innerHTML = '';
    },

    resetState() {
        state.currentVideoId = null;
        state.chatHistory = [];
        state.currentTranscript = null;
    }
};

function renderConversationList(activeVideoId) {
    elements.conversationList.innerHTML = '';

    if (state.conversations.size === 0) {
        elements.conversationList.innerHTML = MESSAGES.noConversations;
        return;
    }

    state.conversations.forEach((conv, videoId) => {
        const link = document.createElement('div');
        link.className = `conversation-link ${videoId === activeVideoId ? 'active' : ''}`;
        link.innerHTML = `
            <div class="conversation-content">
                <span class="title">${conv.title}</span>
                <span class="date">${new Date(conv.lastUpdated).toLocaleDateString()}</span>
            </div>
            <button class="delete-btn" title="Delete this conversation">x</button>
        `;

        // Add click handler for loading conversation
        const contentDiv = link.querySelector('.conversation-content');
        contentDiv.addEventListener('click', () => storage.loadConversation(videoId));

        // Add click handler for delete button
        const deleteBtn = link.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent conversation from loading when deleting
            if (confirm('Are you sure you want to delete this conversation?')) {
                await storage.deleteConversation(videoId);
            }
        });

        elements.conversationList.appendChild(link);
    });
}

function renderConversation() {
    elements.chatMessages.innerHTML = '';
    state.chatHistory.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `markdown-body message ${msg.role}-message`;
        if (msg === state.chatHistory[0] && msg.role === 'user') {
            messageDiv.innerHTML = `
                <div class="message-header">Transcript</div>
                ${markdownToHtml(msg.content)}
            `;
        } else {
            messageDiv.innerHTML = markdownToHtml(msg.content);
        }
        elements.chatMessages.appendChild(messageDiv);
    });
}

async function checkSummaryStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLibraryView = urlParams.get('view') === 'library';

    const data = await chrome.storage.local.get([
        "currentSummary",
        "summaryStatus",
        "summaryError",
        "currentVideo",
        "conversations",
        "initialTranscript"
    ]);

    const newConversations = new Map(data.conversations || []);
    if (!utils.areConversationsEqual(state.conversations, newConversations)) {
        state.conversations = newConversations;
        renderConversationList(data.currentVideo?.id);
    }

    if (isLibraryView) {
        ui.showLoading(false);
        ui.showChatContainer(true);
        ui.showChatInput(false);

        if (!state.currentVideoId && state.conversations.size > 0) {
            // Get the first conversation
            const firstConversation = Array.from(state.conversations.entries())[0];
            const [firstVideoId] = firstConversation;
            // Load the first conversation
            await storage.loadConversation(firstVideoId);
        } else if (!state.currentVideoId) {
            ui.showWelcomeMessage();
        }
        return;
    }

    switch (data.summaryStatus) {
        case 'loading':
            ui.showLoading(true);
            if (data.initialTranscript && data.currentVideo) {
                ui.clearChatMessages();
                const transcriptDiv = document.createElement('div');
                transcriptDiv.className = 'markdown-body message user-message';
                transcriptDiv.innerHTML = markdownToHtml(data.initialTranscript);
                elements.chatMessages.appendChild(transcriptDiv);
                state.chatHistory = [{ role: 'user', content: data.initialTranscript }];
            }
            setTimeout(checkSummaryStatus, CHAT_CHECK_INTERVAL);
            break;

        case 'complete':
            if (data.currentSummary && data.currentVideo) {
                ui.showChatContainer(true);
                ui.showChatInput(true);
                state.currentVideoId = data.currentVideo.id;
                await chat.sendMessage(data.currentSummary, true);
                await storage.saveConversation();
                await updateConversationList(data);
            }
            break;

        case 'error':
            ui.showLoading(false);
            chat.showError(data.summaryError);
            await chrome.storage.local.set({ summaryStatus: null });
            break;

        default:
            if (data.summaryStatus === 'loading') {
                ui.showLoading(true);
                setTimeout(checkSummaryStatus, CHAT_CHECK_INTERVAL);
            }
            break;
    }
}

async function updateConversationList(data) {
    const { conversations } = await chrome.storage.local.get('conversations');
    state.conversations = new Map(conversations || []);
    renderConversationList(data.currentVideo?.id);

    await chrome.storage.local.set({
        summaryStatus: null,
        initialTranscript: null
    });
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
    renderConversationList();
    checkSummaryStatus();
    document.getElementById("send-message").addEventListener("click", handlers.handleSendMessage);
    elements.chatInput.addEventListener("keypress", (e) => handlers.handleEnterKey(e));
});