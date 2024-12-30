// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeUI(true));
} else {
    initializeUI(true);
}