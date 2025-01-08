import { Prompt } from "@/utils/prompts";

export const PromptItem = ({ pattern, content, isDefault }: Prompt) => {
    return (
        <div className="prompt-item">
            <div className="prompt-pattern" title={pattern}>{pattern}</div>
            <div className="prompt-content">{content}</div>
            <div className="prompt-actions">
                <button className="btn" data-action="edit" data-pattern={pattern}>Edit</button>
                <button className="btn danger-btn" data-action="delete" data-pattern={pattern}>Delete</button>
                <button className="btn default-btn{{defaultClass}}" data-action="default" data-pattern={pattern}>
                    {isDefault ? 'Default' : 'Set as Default'}
                </button>
            </div>
        </div>
    );
};