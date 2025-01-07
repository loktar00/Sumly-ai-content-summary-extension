export const Summarize = () =>  (
    <>
        <div className="prompt-selector">
            <select id="prompt-selector">
                <option value="default">Default System Prompt</option>
            </select>
            </div>
            <textarea id="system-prompt" rows={6} cols={50} placeholder="System Prompt"></textarea>
            <div className="summarize-controls">
            <button id="summarize-transcript" className="btn ai-btn">Summarize Page with AI</button>
            <div className="chunk-control">
                <label>
                    <input type="checkbox" id="enable-chunking" checked />
                    <span>Auto-chunk large content</span>
                </label>
            </div>
        </div>
        <textarea id="transcript-area" rows={5} cols={50} placeholder="Content will appear here..."/>
        <div className="button-group source-buttons">
            <button id="fetch-webpage" className="btn">Get Page Content</button>
            <button id="fetch-current-transcript" className="btn">Get Transcript</button>
            <button id="copy-to-clipboard" className="btn">Copy to Clipboard</button>
        </div>
        </>
);