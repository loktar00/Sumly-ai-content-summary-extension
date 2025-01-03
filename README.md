# AI Content Assistant

A Chrome extension that helps analyze and discuss content from any webpage or YouTube video using AI.

## Example extension in action

https://github.com/user-attachments/assets/3fd1d773-f416-4ffd-8308-5cad147676f8

## Features

- 🌐 Extract and analyze content from any webpage
- 🎥 Fetch transcripts from YouTube videos
- 🤖 Generate AI summaries using Ollama
- 💬 Interactive chat interface for follow-up questions
- 🎨 Dark mode interface with cyberpunk-inspired design
- ⚙️ Configurable AI model settings
- 📝 Customizable system prompts
- 📋 Easy content copying

## Requirements

- Chrome browser
- [Ollama](https://ollama.ai/) running locally or on a remote server
- An AI model pulled into Ollama (e.g., mistral, llama2, etc.)

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder from this repository

## Configuration

1. Click the extension settings icon (⚙️)
2. Enter your Ollama server URL (default: http://localhost:11434)
3. Click "Fetch Available Models" to see models available on your Ollama server
4. Select your preferred model
5. Customize the system prompt if desired
6. Adjust the context window size based on your needs and model capabilities
7. Click Save

## Usage

### For Any Webpage
1. Navigate to any webpage
2. Click the extension icon to open the side panel
3. Click "Get Page Content" to extract the main content
4. Click "Summarize Page with AI" to generate a summary
5. Ask follow-up questions in the chat interface

### For YouTube Videos
1. Navigate to any YouTube video
2. Click the extension icon to open the side panel
3. Click "Get Transcript" to fetch the video transcript
4. Click "Summarize Page with AI" to generate a summary
5. Ask follow-up questions in the chat interface

## Settings
![image](https://github.com/user-attachments/assets/040c5a11-237e-4a77-8829-bf294aecd109)

## Development

The extension is built with vanilla JavaScript and uses:
- Chrome Extension APIs
- Ollama API for AI functionality
- Custom CSS for styling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
