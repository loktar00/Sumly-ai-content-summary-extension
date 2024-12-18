# **YouTube Transcript Fetcher**

This project consists of two main components:
1. A **Python Flask Server** that retrieves YouTube video transcripts using the `youtube-transcript-api`.
2. A **Browser Extension** that interacts with the Flask server to fetch and manage YouTube video transcripts directly from the browser.

## **Features**
- Retrieve YouTube transcripts via a Python Flask server.
- Browser extension to interact with the server and fetch transcripts for videos.
- Configurable server URL via the extension’s settings.

---

## **Getting Started**

### **Prerequisites**
- Anaconda or Miniconda
- Python 3.8 or higher
- Browser supporting extensions (e.g., Chrome, Edge, or Firefox)
- Node.js and npm (optional, for future development)

---

## **1. Setting Up the Flask Server**

### **Installation**
1. Clone the repository:
    ```bash
    git clone https://github.com/your-repo/youtube-transcript-fetcher.git
    cd youtube-transcript-fetcher/server
    ```

2. Create a new Anaconda environment:
    ```bash
    conda create --name yt-transcripts python=3.8 -y
    conda activate yt-transcripts
    ```

3. Install the required dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### **Running the Server**
1. Start the Flask server:
    ```bash
    python app.py
    ```

2. By default, the server will run on `http://localhost:8892`. You can update the port or host in `app.py` if needed.

3. Access logs will be saved in `transcript_server.log`.

---

## **2. Setting Up the Browser Extension**

### **Installation**
1. Navigate to the `extension` directory:
    ```bash
    cd ../extension
    ```

2. Open your browser and go to the extensions page:
    - Chrome: `chrome://extensions/`
    - Edge: `edge://extensions/`
    - Firefox: `about:addons`

3. Enable **Developer Mode** (usually a toggle on the extensions page).

4. Click **Load Unpacked** (or **Load Temporary Add-on** for Firefox).

5. Select the `extension` directory from this project.

### **Usage**
- Once loaded, the extension icon will appear in your browser toolbar.
- Clicking the icon opens the popup, allowing you to:
  - Fetch notifications of YouTube videos and process them.
  - Fetch a transcript for the current video.

- Notifications of youtube videos are all processed and saved in the directory server/transcripts/
---

## **3. Configuring the Extension**

### **Accessing Settings**
1. Open the extension popup by clicking the icon in the browser toolbar.
2. Click the **Settings** button (available in the popup).
3. The settings page allows you to configure:
   - **Server URL**: The URL of the Flask server. Default: `http://localhost:8892`.

### **Returning to Main Popup**
- On the settings page, click the **Back to Main** button to return to the popup or follow the instructions to reopen the popup manually.

---

## **How to Use**

### **1. Fetch Transcripts for YouTube Videos**
- Navigate to a YouTube video.
- Open the extension popup and click **Fetch Current Transcript**.
- The transcript will appear in the text area. You can copy it to your clipboard.

### **2. Batch Process Videos**
- Fetch all notifications by clicking **Fetch Notifications** in the popup.
- The extension processes all video links found in notifications, sending them to the server for transcript retrieval.

---

## **Project Structure**

```
youtube-transcript-fetcher/
│
├── server/
│   ├── app.py                 # Flask server script
│   └── requirements.txt       # Python dependencies
│
├── extension/
│   ├── manifest.json          # Extension manifest file
│   ├── popup.html             # Main popup UI
│   ├── popup.js               # Main popup logic
│   ├── options.html           # Settings page UI
│   ├── options.js             # Settings page logic
│   └── icons/                 # Extension icons
│
└── README.md                  # Project documentation
```
---

## **Known Issues**
- **Transcript API Limitations**: The `youtube-transcript-api` library relies on YouTube’s publicly available transcripts. Videos without transcripts will not work.

---

## **Contributing**
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a Pull Request.

---

## **License**
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## **Support**
For issues or questions, please open a GitHub issue or contact the repository owner.