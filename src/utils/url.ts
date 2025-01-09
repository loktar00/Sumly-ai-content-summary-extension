export async function getCurrentUrl() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0]?.url) {
        return null;
    }

    return tabs[0].url;
}

export async function getCurrentVideoId() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.url) return null;
    return new URL(tabs[0].url).searchParams.get("v");
}

export async function getVideoTitle() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.title?.replace(' - YouTube', '') || 'Video';
    } catch {
        return 'Video';
    }
}

function patternToRegex(pattern: string) {
    // Split into path and query parts
    const [pathPart, queryPart] = pattern.split('?');

    // Build path regex
    let pathRegex = '^' + pathPart
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
        .replace(/\*/g, '[^?]*');              // * matches anything except ?

    // Add query parameters if they exist
    if (queryPart) {
        pathRegex += '\\?';
        const queryParams = queryPart.split('&').map(param => {
            return param.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '[^&]*');
        });

        // Allow query parameters in any order
        pathRegex += queryParams
            .map(param => `(?=.*${param})`)
            .join('');

        pathRegex += '[^#]*';  // Match rest of query string until fragment
    }

    return new RegExp(pathRegex);
}

function calculateSpecificity(pattern: string) {
    // Count non-wildcard segments
    const segments = pattern.split('/');
    const queryParts = pattern.split('?')[1]?.split('&') || [];

    return segments.filter(s => s !== '*').length +
           queryParts.filter(p => p !== '*').length;
}

export async function findBestMatchForUrl(patterns: string[]) {
    const url = await getCurrentUrl();

    if (!url) {
        return null;
    }

    // Clean the URL for matching
    const cleanUrl = url.replace(/^www\./, '');

    // Convert patterns to regex and find matches
    const matches = patterns
        .map(pattern => ({
            pattern,
            regex: patternToRegex(pattern),
            specificity: calculateSpecificity(pattern)
        }))
        .filter(({ pattern, regex }) => {
            try {
                return regex.test(cleanUrl);
            } catch (e) {
                console.error('Regex error for pattern:', pattern, e);
                return false;
            }
        })
        .sort((a, b) => {
            // Sort by specificity first
            const specificityDiff = b.specificity - a.specificity;
            if (specificityDiff !== 0) return specificityDiff;

            // If same specificity, prefer longer pattern
            return b.pattern.length - a.pattern.length;
        });

    return matches[0]?.pattern;
}