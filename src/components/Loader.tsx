export const Loader = () => {
    return (
        <div className="loading-container">
            <div className="neon-loader">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} />
                ))}
            </div>
        </div>
    );
}