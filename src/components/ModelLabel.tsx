type ModelLabelProps = {
    provider: string;
    model: string;
}

export const ModelLabel = ({ provider, model }: ModelLabelProps) => {
    return (
        <div className="form-group">
            <div className="model-label">
                <span className="glow text">{provider}: {model}</span>
            </div>
        </div>
    );
};