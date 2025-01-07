import { Link } from "wouter";

export const PromptManager = () => (
    <div className="prompt-manager">
        <Link to="/">
            <button id="back-button" className="btn back-btn">← Back</button>
        </Link>
        <div className="prompt-form">
            <div className="prompt-url-input">
                <input type="text" id="prompt-pattern" placeholder="URL pattern (e.g., reddit.com/user)" />
                <button id="use-current-url" className="btn">Get URL</button>
            </div>
            <textarea id="prompt-content" rows={6} placeholder="Enter prompt for this URL pattern"></textarea>
            <button id="save-prompt" className="btn">Save</button>
        </div>
        <div className="saved-prompts">
            <h3>Saved Prompts</h3>
            <div id="prompts-list"></div>
        </div>
    </div>
);