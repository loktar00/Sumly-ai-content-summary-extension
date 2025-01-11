// Function to simulate clicking the Notifications button
function autoClickNotifications() {
    const notificationsButton = document.querySelector('button[aria-label="Notifications"]');

    if (notificationsButton) {
        notificationsButton.click();
        return true;
    }

    return false;
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
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
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

// Xpath selector
let highlightedElement = null;

function handleMouseOver(event) {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
    }

    highlightedElement = event.target;
    highlightedElement.style.outline = '2px solid blue';
}

function handleMouseOut() {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement = null;
    }
}

function handleClick(event) {
    event.preventDefault();
    const xpath = getXPath(event.target);
    console.log('XPath:', xpath);
    window.postMessage({ type: 'SELECTED_XPATH', xpath }, '*');
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
    document.removeEventListener('click', handleClick);
}

function getXPath(element) {
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    if (element === document.body) {
        return '/html/body';
    }
    let index = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
            return `${getXPath(element.parentNode)}/${element.tagName.toLowerCase()}[${index + 1}]`;
        }
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
            index++;
        }
    }
    return '';
}

document.addEventListener('mouseover', handleMouseOver);
document.addEventListener('mouseout', handleMouseOut);
document.addEventListener('click', handleClick);