const templates = {
    summary: `
        <div class="summary-content">
            <div class="model-label">
                <span class="glow text">Model: {{model}}</span>
            </div>
            <div class="main-content">
                <div id="chat-container" class="chat-container" role="log" aria-live="polite">
                    <div id="chat-messages" class="chat-messages">
                        <div id="formatted-summary" class="markdown-body message"></div>
                    </div>
                    <div id="chat-loading" class="chat-loading hidden">
                        <div class="neon-loader">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                    <div class="chat-input-container hidden">
                        <textarea id="chat-input" rows="3" placeholder="Ask a question about the transcript..."></textarea>
                        <div class="button-group">
                            <button id="back-to-transcript" class="btn">← Back</button>
                            <button id="send-message" class="btn">Send</button>
                        </div>
                    </div>
                </div>
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