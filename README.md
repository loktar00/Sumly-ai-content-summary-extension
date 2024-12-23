# **YouTube Transcript AI Assistant**
![base](https://github.com/user-attachments/assets/eb1ff30f-7f8a-42cf-8ba7-e7787e244b92)

This project combines a Flask server for YouTube transcript retrieval with an AI-powered browser extension that provides transcript summaries and interactive conversations about video content.

## **Features**

### **Transcript Management**
- Fetch transcripts from any YouTube video
- Batch process transcripts from YouTube notifications
- Copy transcripts to clipboard
- Store transcripts locally for future reference

### **AI Integration**
- Summarize video transcripts using AI
- Interactive chat interface for transcript discussions
- Configurable AI models via Ollama
- Streaming responses for real-time feedback
- Persistent conversation history
- Context-aware follow-up questions

### **User Interface**
- Clean, modern interface for transcript management
- Library view for accessing past summaries
- Real-time chat with typing indicators
- Markdown support for formatted responses
- Conversation management (view, delete, switch between conversations)

### **Configuration**
- Configurable server URL
- Adjustable AI settings (model, system prompt)
- Model selection from available Ollama models
- Customizable system prompts for different use cases

## ** Screenshots **
#### **Transcript**
![first screen](https://github.com/user-attachments/assets/92643aca-63e5-4c22-a5e1-298d71ac0544)

#### **Summary Screen**
![Summary screen](https://github.com/user-attachments/assets/c79af28a-b583-43fa-bd0d-5beb24ee8d26)

#### **Library View**
![library screen](https://github.com/user-attachments/assets/f2b49e6b-fb90-49b4-9e24-3682549b5afb)

#### **Settings**
![settings screen](https://github.com/user-attachments/assets/2f6fdb5a-09ff-4c6b-9704-b3c8b3869b91)



---

## **Getting Started**

### **Prerequisites**
- Anaconda or Miniconda
- Python 3.8 or higher
- Browser supporting extensions (Chrome, Edge, or Firefox)
- [Ollama](https://ollama.ai/) for AI functionality

### **Installation**

#### **1. Server Setup**
1. Clone and set up the repository:
    ```bash
    git clone https://github.com/your-repo/youtube-transcript-ai.git
    cd youtube-transcript-ai/server
    conda create --name yt-transcripts python=3.8 -y
    conda activate yt-transcripts
    pip install -r requirements.txt
    ```

2. Start the Flask server:
    ```bash
    python app.py
    ```

#### **2. Ollama Setup**
1. Install Ollama following instructions at [ollama.ai](https://ollama.ai)
2. Pull your preferred model:
    ```bash
    ollama pull mistral
    ```
3. Start the Ollama server (usually runs on port 11434)

#### **3. Browser Extension Setup**
1. Load the extension in developer mode:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` directory

---

## **Using the Extension**

### **Basic Usage**
1. Click the extension icon on any YouTube video
2. Use "Get Transcript" to fetch the current video's transcript
3. Click "Summarize with AI" to generate an AI summary
4. Interact with the AI through the chat interface

### **Library and Conversations**
- Click the "📚" icon to access your summary library
- View past conversations and summaries
- Ask follow-up questions about any saved transcript
- Delete unwanted conversations
- Switch between different video summaries

### **Settings Configuration**
1. Click the "⚙️" icon to open settings
2. Configure:
   - Transcript API URL
   - AI API Base URL (Ollama)
   - AI Model selection
   - System prompt customization

---

## **Project Structure**
```
youtube-transcript-ai/
├── server/
│   ├── app.py                 # Flask server
│   └── requirements.txt       # Python dependencies
│
├── extension/
│   ├── manifest.json          # Extension manifest
│   ├── popup.html/js          # Main popup interface
│   ├── summary.html/js        # Summary and chat interface
│   ├── options.html/js        # Settings interface
│   ├── markdown.js           # Markdown processor
│   └── style.css            # Unified styling
```

---

## **Technical Details**

### **AI Integration**
- Uses Ollama for local AI processing
- Supports streaming responses
- Maintains conversation context
- Handles markdown formatting

### **Data Management**
- Local storage for conversation history
- Transcript preservation
- Configurable settings sync

### **UI Features**
- Real-time response streaming
- Loading indicators
- Conversation management
- Responsive design

---

## **Contributing**
Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## **License**
This project is licensed under the MIT License.

---

## **Support**
For issues, questions, or contributions, please open a GitHub issue or contact the repository maintainers.
