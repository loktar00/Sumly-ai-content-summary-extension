// Wait for DOM to be ready
// Has to be done this way, if done within the html file it doesn't work, must be something to do with it being an extension
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeUI());
} else {
    initializeUI();
}