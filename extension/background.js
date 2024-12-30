// Simple state tracking
let isPopupView = false;

chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Background] Extension installed');
    try {
        // Start in side panel mode
        await chrome.action.setPopup({ popup: '' });  // No popup by default
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

// Handle messages from popup/side panel
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'toggleView') {
        try {
            if (isPopupView) {
                // Switch to side panel
                await chrome.action.setPopup({ popup: '' });
                await chrome.sidePanel.setOptions({
                    enabled: true,
                    path: 'side-panel.html'
                });
                isPopupView = false;
            } else {
                // Switch to popup
                await chrome.sidePanel.setOptions({ enabled: false });
                await chrome.action.setPopup({ popup: 'popup.html' });
                isPopupView = true;
            }
            sendResponse({ success: true });
        } catch (error) {
            console.error('[Background] Toggle error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true;  // Keep the message channel open for async response
});
