
export async function getCurrentVideoId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return null;
    return new URL(tabs[0].url).searchParams.get("v");
}

export async function getVideoTitle(videoId: string) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.title?.replace(' - YouTube', '') || `Video ${videoId}`;
    } catch {
        return `Video ${videoId}`;
    }
}

export function parseTranscriptXml(transcriptXml: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");

    // Create a textarea element for decoding HTML entities
    const decoder = document.createElement('textarea');

    return Array.from(xmlDoc.getElementsByTagName('text'))
        .map(node => ({
            text: (node.textContent || '')
                .trim()
                // Decode HTML entities
                .replace(/&([^;]+);/g, (match) => {
                    decoder.innerHTML = match;
                    return decoder.value;
                })
                // Replace multiple spaces with single space
                .replace(/\s+/g, ' ')
                // Remove any remaining newlines
                .replace(/\n/g, ' '),
            start: parseFloat(node.getAttribute('start') || '0'),
            duration: parseFloat(node.getAttribute('dur') || '0')
        }))
        .filter(line => line.text.length > 0)
        .map(line => line.text)
        // Join with single space instead of newline
        .join(' ');
}

export async function fetchYouTubeTranscript(videoId: string) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'Accept-Language': 'en-US',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = await response.text();
        const splitHtml = html.split('"captions":');

        if (splitHtml.length <= 1) {
            throw new Error('No captions found in video');
        }

        const captionsJson = JSON.parse(
            splitHtml[1].split(',"videoDetails')[0].replace(/\n/g, '')
        );

        const captionTracks = captionsJson?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!captionTracks?.length) {
            throw new Error('No caption tracks found');
        }

        const track = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0];
        const transcriptResponse = await fetch(track.baseUrl);
        const transcriptXml = await transcriptResponse.text();

        return parseTranscriptXml(transcriptXml);
    } catch (error: unknown) {
        console.error('Error fetching transcript:', error);
        throw new Error(`Failed to fetch transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function cleanContent(content: string) {
    return content
        .replace(/\n\s*\n\s*\n/g, '\n\n')  // Replace 3+ line breaks with 2
        .replace(/\s+/g, ' ')               // Replace multiple spaces with single space
        .replace(/\n +/g, '\n')             // Remove spaces at start of lines
        .replace(/ +\n/g, '\n')             // Remove spaces at end of lines
        .trim();                            // Remove leading/trailing whitespace
}

async function getPageContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
        throw new Error('No active tab found');
    }

    // Inject and execute content script
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Create a clone of the document
            const virtualDoc = document.cloneNode(true) as Document;
            const virtualBody = virtualDoc.querySelector('body');

            if (!virtualBody) {
                return document.body.innerText;
            }

            // Remove unwanted elements from the clone
            const elementsToRemove = virtualBody.querySelectorAll(
                'script, style, noscript, img, svg, video, audio, nav, footer, header, aside'
            );

            elementsToRemove.forEach(el => el.remove());

            let innerText = '';

            const main = virtualBody.querySelector('main');
            if (main) {
                innerText += main.innerText;
            }

            innerText += virtualBody.innerText;

            // Clean up multiple line breaks
            return cleanContent(innerText);
        }
    });

    return result;
}

export async function fetchWebpage() {
    try {
        const content = await getPageContent();
        return content?.trim();
    } catch (error: unknown) {
        if (error instanceof Error) {
            return `Error fetching page content: ${error.message}`;
        }
        return 'Error fetching page content';
    }
}