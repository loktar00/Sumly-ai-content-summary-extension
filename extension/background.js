// Simple state tracking
let isPopupView = false;

chrome.runtime.onInstalled.addListener(async () => {
    try {
        await chrome.action.setPopup({ popup: '' });
        await chrome.sidePanel.setOptions({
            enabled: true,
            path: 'side-panel.html'
        });
    } catch (error) {
        console.error('[Background] Setup error:', error);
    }
});

// Handle extension icon click when in side panel mode
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url?.includes('youtube.com')) {
        alert('Please navigate to a YouTube video first');
        return;
    }

    if (!isPopupView) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
    }
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
        } catch (error) {
            console.error('[Background] Error enabling side panel:', error);
        }
    }
});