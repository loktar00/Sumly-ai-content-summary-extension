type TokenDisplayProps = {
    tokenCount: number;
    max: number;
}

export const TokenDisplay = ({ tokenCount, max }: TokenDisplayProps) => {
    const isWarning = tokenCount > max * 0.8;

    if (isNaN(max)) {
        return <div className={`token-display ${isWarning && 'token-warning'}`}>{tokenCount.toLocaleString()}</div>
    }

    return (
        <div className={`token-display ${isWarning && 'token-warning'}`}>{tokenCount.toLocaleString()} / {max.toLocaleString()}</div>
    );
}