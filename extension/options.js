// Save the URL to storage
document.getElementById("save").addEventListener("click", () => {
    const apiUrl = document.getElementById("apiUrl").value;
    chrome.storage.sync.set({ apiUrl }, () => {
        document.getElementById("status").textContent = "URL saved!";
    });
});

// Load the saved URL when the options page is opened
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get("apiUrl", (data) => {
        if (data.apiUrl) {
            document.getElementById("apiUrl").value = data.apiUrl;
        }
    });
});
