export async function getCurrentUrl() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0]?.url) {
        return null;
    }

    return tabs[0].url;
}

export async function getCurrentVideoId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return null;
    return new URL(tabs[0].url).searchParams.get("v");
}

export async function getVideoTitle(videoId: string) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.title?.replace(' - YouTube', '') || `Video ${videoId}`;
    } catch {
        return `Video ${videoId}`;
    }
}