let videos = []; // List of videos to process
let currentIndex = 0; // Track the current video being processed

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Fetch the server URL from storage or use a default
async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("apiUrl", (data) => {
      resolve(data.apiUrl || "http://localhost:8892"); // Default URL
    });
  });
}

// Button: Fetch all videos in notifications
document.getElementById("fetch-notifications").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "fetch_notifications" }, async () => {
      console.log("Fetching notifications...");

      setTimeout(async () => {
        chrome.storage.local.get("videos", async (data) => {
          if (data.videos && data.videos.length > 0) {
            console.log("Videos fetched successfully.");
            videos = data.videos; // Load videos into the global variable
            currentIndex = 0; // Start processing
            await processVideosSequentially(); // Begin processing videos
          } else {
            alert("No videos found to process.");
          }
        });
      }, 3000);
    });
  });
});

// Process videos sequentially and send them to the server
async function processVideosSequentially() {
  for (currentIndex = 0; currentIndex < videos.length; currentIndex++) {
    const video = videos[currentIndex];
    const videoId = extractVideoId(video.url);

    if (!videoId) {
      console.error(`Invalid video URL: ${video.url}`);
      continue; // Skip to the next video
    }

    console.log(`Processing (${currentIndex + 1}/${videos.length}): ${video.title}`);
    void await sendVideoToServer(videoId, video.title);
  }

  alert("All videos have been processed!");
  console.log("Processing complete.");
}

// Send video data to the Flask server
async function sendVideoToServer(videoId, videoTitle) {
  const serverUrl = await getApiUrl(); // Fetch configurable server URL
  const url = `${serverUrl}/fetch_transcript?id=${videoId}&title=${encodeURIComponent(videoTitle)}`;

  try {
    const response = await fetch(url, { method: "GET" });
    const result = await response.json();

    if (response.ok) {
      console.log(`Server Response: ${result.title} - ${result.status}`);
      return true; // Success
    } else {
      console.error(`Error from server: ${result.error || "Unknown error"}`);
      return false; // Failure
    }
  } catch (error) {
    console.error(`Network error for ${videoTitle}:`, error);
    return false; // Network failure
  }
}

// Utility: Extract video ID from a YouTube URL
function extractVideoId(url) {
  const match = url.match(/v=([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

document.addEventListener("DOMContentLoaded", () => {
  const fetchButton = document.getElementById("fetch-current-transcript");
  const copyButton = document.getElementById("copy-to-clipboard");
  const transcriptArea = document.getElementById("transcript-area");

  // Fetch transcript for the current video
  fetchButton.addEventListener("click", async () => {
    const videoId = await getCurrentVideoId();

    if (!videoId) {
      alert("Could not determine video ID. Please ensure you're on a YouTube video page.");
      return;
    }

    transcriptArea.value = "Fetching transcript...";
    const serverUrl = await getApiUrl(); // Fetch configurable server URL
    const url = `${serverUrl}/fetch_transcript?id=${videoId}&title=Current+Video&return_only=true`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === "success") {
        transcriptArea.value = result.transcript;
        console.log("Transcript fetched successfully.");
      } else {
        transcriptArea.value = "Transcript not available.";
        console.error("Failed to fetch transcript:", result.error);
      }
    } catch (error) {
      console.error("Error fetching transcript:", error);
      transcriptArea.value = "Error fetching transcript.";
    }
  });

  // Copy transcript to clipboard
  copyButton.addEventListener("click", () => {
    const transcriptArea = document.getElementById("transcript-area");
    navigator.clipboard.writeText(transcriptArea.value).then(() => {
      alert("Transcript copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy:", err);
      alert("Failed to copy text to clipboard.");
    });
  });

  // Get the video ID from the currently active YouTube tab
  async function getCurrentVideoId() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].url) {
          const url = new URL(tabs[0].url);
          const videoId = url.searchParams.get("v");
          console.log("Current video ID:", videoId);
          resolve(videoId);
        } else {
          resolve(null);
        }
      });
    });
  }
});