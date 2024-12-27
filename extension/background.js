// Simple state tracking
let isSidePanel = false;

console.log('[Background] Script loading...');

chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Background] Extension installed');
    try {
        // Start in popup mode
        await chrome.action.setPopup({ popup: 'popup.html' });
        await chrome.sidePanel.setOptions({
            enabled: false,
            path: 'side-panel.html'
        });
    } catch (error) {
        console.error('[Background] Setup error:', error);
    }
});

// Reset to popup when side panel closes
chrome.sidePanel.onClose.addListener(async () => {
    console.log('[Background] Side panel closed');
    isSidePanel = false;
    await chrome.action.setPopup({ popup: 'popup.html' });
});

// Handle YouTube navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
        console.log('[Background] YouTube video page loaded');
        try {
            await chrome.sidePanel.setOptions({
                enabled: true,
                path: 'side-panel.html'
            });

            // Only open if needed
            if (isSidePanel) {
                await chrome.sidePanel.open({
                    windowId: tab.windowId
                });
            }
        } catch (error) {
            console.error('[Background] Error enabling side panel:', error);
        }
    }
});