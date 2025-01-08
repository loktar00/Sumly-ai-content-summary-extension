export const Summary = ({ model }: { model: string }) => {
    return (
        <div className="summary-content">
            <div className="model-label">
                <span className="glow text">Model: {model}</span>
            </div>
            <div className="main-content">
                <div id="chat-container" className="chat-container" role="log" aria-live="polite">
                    <div id="chat-messages" className="chat-messages">
                        <div id="formatted-summary" className="markdown-body"></div>
                    </div>
                    <div id="chat-loading" className="chat-loading hidden">
                        <div className="neon-loader">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="token-display"></div>
                        <div className="button-group loading-controls">
                            <button id="cancel-generation" className="btn">← Back</button>
                            <button id="stop-generation" className="btn danger-btn">Stop</button>
                        </div>
                    </div>
                    <div className="chat-input-container hidden">
                        <textarea id="chat-input" rows={3} placeholder="Ask a question about the content..."></textarea>
                        <div className="token-display"></div>
                        <div className="button-group">
                            <button id="back-to-transcript" className="btn">← Back</button>
                            <button id="send-message" className="btn">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};
