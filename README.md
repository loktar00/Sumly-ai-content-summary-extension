# YouTube Transcript AI Assistant

A Chrome extension that fetches YouTube video transcripts and uses AI to provide summaries and answer questions about the content.

## Features

- 🎥 Fetch transcripts from YouTube videos
- 🤖 Generate AI summaries using Ollama
- 💬 Ask follow-up questions about the video content
- ⚙️ Configurable AI model settings
- 🎨 Dark mode interface with cyberpunk-inspired design

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

1. Navigate to any YouTube video
2. Click the extension icon to open the side panel
3. Click "Get Transcript" to fetch the video transcript
4. Click "Summarize with AI" to generate a summary
5. Ask follow-up questions in the chat interface
6. Use the copy button to copy the transcript to your clipboard

## Development

The extension is built with vanilla JavaScript and uses:
- Chrome Extension APIs
- Ollama API for AI functionality
- Custom CSS for styling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
