const templates = {
    summary: `
        <div class="summary-content">
            <button id="back-to-transcript" class="btn">← Back</button>
            <div class="main-content">
                <div id="chat-container" class="chat-container" role="log" aria-live="polite">
                    <div id="chat-messages" class="chat-messages">
                        <div id="formatted-summary" class="markdown-body message"></div>
                    </div>

                    <div id="chat-loading" class="chat-loading hidden">
                        <div class="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div class="chat-input-container hidden">
                        <textarea id="chat-input" rows="3" placeholder="Ask a question about the transcript..."></textarea>
                        <button id="send-message" class="btn">Send</button>
                    </div>
                </div>
                <textarea id="summary-area" rows="15" cols="50" readonly style="display: none;"></textarea>
            </div>
        </div>
    `
};

// Template rendering function
function renderTemplate(templateName, data) {
    let template = templates[templateName];
    Object.keys(data).forEach(key => {
        template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
    });
    return template;
}