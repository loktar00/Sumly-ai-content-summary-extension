const youtubeUtils = {
    getNotificationVideos() {
        const notificationItems = document.querySelectorAll('ytd-notification-renderer');
        return Array.from(notificationItems).map(item => ({
            url: item.querySelector('a#contentUrl')?.href || '',
            title: item.querySelector('#content-text')?.textContent || 'Untitled'
        })).filter(video => video.url);
    },

    async saveVideos(videos) {
        if (!videos.length) {
            console.log('No videos found in notifications');
            return;
        }
        await chrome.storage.local.set({ videos });
        console.log(`Saved ${videos.length} videos from notifications`);
    }
};

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetch_notifications") {
        const videos = youtubeUtils.getNotificationVideos();
        youtubeUtils.saveVideos(videos);
        sendResponse({ status: "success", count: videos.length });
    }
});