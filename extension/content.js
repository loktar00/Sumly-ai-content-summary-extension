console.log("YouTube Notifications Scraper Loaded");

// Function to simulate clicking the Notifications button
function autoClickNotifications() {
  const notificationsButton = document.querySelector('button[aria-label="Notifications"]');

  if (notificationsButton) {
    console.log("Clicking the Notifications button...");
    notificationsButton.click();
    return true;
  } else {
    console.log("Notifications button not found.");
    return false;
  }
}

// Function to extract video titles and URLs
function extractNotificationVideos() {
  const videoData = [];

  // Delay to allow the notification panel to load
  setTimeout(() => {
    const notificationItems = document.querySelectorAll("ytd-notification-renderer");

    notificationItems.forEach((item) => {
      const titleElement = item.querySelector("yt-formatted-string");
      const linkElement = item.querySelector("a");

      if (titleElement && linkElement) {
        videoData.push({
          title: titleElement.innerText,
          url: linkElement.href,
        });
      }
    });

    // Save extracted data to Chrome storage
    chrome.storage.local.set({ videos: videoData }, () => {
      console.log("Extracted video URLs saved:", videoData);
    });
  }, 2000); // 2-second delay for notifications to load
}

// Listen for a message from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetch_notifications") {
    console.log("Fetching notifications...");
    const clicked = autoClickNotifications();
    if (clicked) {
      extractNotificationVideos();
      sendResponse({ status: "success" });
    } else {
      sendResponse({ status: "failure", message: "Notifications button not found" });
    }
  }
});