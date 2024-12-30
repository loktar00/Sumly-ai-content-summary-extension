// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeUI(false));
} else {
    initializeUI(false);
}