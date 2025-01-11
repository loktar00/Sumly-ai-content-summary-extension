import { Prompt } from "@/utils/prompts";
import { usePromptManagerStore } from "@/stores/SavedPrompts";

type PromptItemProps = Prompt & { onEdit: (pattern: string) => void };

export const PromptItem = ({ pattern, content, isDefault, selector, onEdit }: PromptItemProps) => {
    const { deletePrompt, setDefaultPrompt } = usePromptManagerStore();

    const handleDelete = () => {
        deletePrompt(pattern);
    };

    const handleSetDefault = () => {
        setDefaultPrompt(pattern);
    };

    return (
        <div className="prompt-item">
            <div className="prompt-pattern" title={pattern}>{pattern}</div>
            <div className="prompt-selector" title={selector}>{selector}</div>
            <div className="prompt-content">{content}</div>
            <div className="prompt-actions">
                <button className="btn" onClick={() => onEdit(pattern)}>Edit</button>
                <button className="btn danger-btn" onClick={handleDelete}>Delete</button>
                <button className="btn default-btn{{defaultClass}}" onClick={handleSetDefault}>
                    {isDefault ? 'Default' : 'Set as Default'}
                </button>
            </div>
        </div>
    );
};