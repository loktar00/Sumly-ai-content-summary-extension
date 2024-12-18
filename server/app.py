from flask import Flask, request, jsonify
import re
from youtube_transcript_api import YouTubeTranscriptApi
import os
import logging

# Initialize Flask app
app = Flask(__name__)

# Configure logging to console and file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("transcript_server.log"),
        logging.StreamHandler()
    ]
)

def fetch_transcript(video_id):
    """Fetch the transcript for a given YouTube video ID."""
    try:
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        transcript = " ".join([entry["text"] for entry in transcript_data])
        return transcript
    except Exception as e:
        logging.error(f"Error fetching transcript for video ID '{video_id}': {e}")
        return None

def save_transcript_to_file(transcript, video_title):
    """Save the transcript to a file in the transcripts directory, skipping if the file already exists."""
    # Ensure the 'transcripts' directory exists
    output_dir = "transcripts"
    os.makedirs(output_dir, exist_ok=True)

    # Sanitize the file name
    sanitized_title = re.sub(r'[^a-zA-Z0-9 _-]', '', video_title)[:50]
    filename = os.path.join(output_dir, f"{sanitized_title}.txt")

    # Check if file already exists
    if os.path.exists(filename):
        logging.info(f"File '{filename}' already exists. Skipping...")
        return False  # File already exists

    # Save the transcript to the file
    with open(filename, "w", encoding="utf-8") as file:
        file.write(transcript)
    logging.info(f"Transcript saved to: {os.path.abspath(filename)}")
    return True

@app.route("/fetch_transcript", methods=["GET"])
def fetch_transcript_get():
    """API endpoint to fetch the transcript for a single video ID."""
    video_id = request.args.get("id")
    video_title = request.args.get("title", "Unknown Video")
    return_only = request.args.get("return_only", "false").lower() == "true"

    logging.info(f"Received GET request to process video: '{video_title}' - ID: {video_id}")

    if not video_id:
        logging.error("GET request missing 'id' parameter.")
        return jsonify({"error": "Missing 'id' parameter"}), 400

    logging.info(f"Received GET request to process video: '{video_title}' - ID: {video_id}")

    # Fetch the transcript
    transcript = fetch_transcript(video_id)
    if not transcript:
        logging.error(f"Failed to fetch transcript for '{video_title}' (ID: {video_id}).")
        return jsonify({"title": video_title, "error": "Transcript not found", "status": "failed"}), 500

    # Return transcript without saving if return_only=true
    if return_only:
        logging.info(f"Returning transcript for '{video_title}' without saving to file.")
        return jsonify({"title": video_title, "transcript": transcript, "status": "success"}), 200

    # Save transcript to file
    saved = save_transcript_to_file(transcript, video_title)
    return jsonify({"title": video_title, "status": "success" if saved else "skipped"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8892, debug=True)