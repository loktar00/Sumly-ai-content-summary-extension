import { renderTemplate } from './templates.js';

export const promptManager = {
    async savePrompt(pattern, prompt, makeDefault = false) {
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

        // If making this prompt default, remove default flag from others
        if (makeDefault) {
            Object.keys(savedPrompts).forEach(key => {
                if (savedPrompts[key].isDefault) {
                    savedPrompts[key] = {
                        ...savedPrompts[key],
                        isDefault: false
                    };
                }
            });
        }

        // Clean pattern and save prompt
        const cleanPattern = pattern.replace(/^www\./, '');
        savedPrompts[cleanPattern] = {
            content: prompt,
            isDefault: makeDefault
        };

        await chrome.storage.sync.set({ savedPrompts });
    },

    patternToRegex(pattern) {
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
    },

    findBestMatchForUrl(url, patterns) {
        // Clean the URL for matching
        const cleanUrl = url.replace(/^www\./, '');

        // Convert patterns to regex and find matches
        const matches = patterns
            .map(pattern => ({
                pattern,
                regex: this.patternToRegex(pattern),
                specificity: this.calculateSpecificity(pattern)
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
    },

    calculateSpecificity(pattern) {
        // Count non-wildcard segments
        const segments = pattern.split('/');
        const queryParts = pattern.split('?')[1]?.split('&') || [];

        return segments.filter(s => s !== '*').length +
               queryParts.filter(p => p !== '*').length;
    },

    async loadPrompts() {
        const promptsList = document.getElementById('prompts-list');
        const { savedPrompts = {} } = await chrome.storage.sync.get('savedPrompts');

        promptsList.innerHTML = Object.entries(savedPrompts)
            .map(([pattern, promptData]) => renderTemplate('promptItem', {
                pattern,
                promptContent: promptData.content,
                defaultClass: promptData.isDefault ? ' is-default' : '',
                defaultText: promptData.isDefault ? '✓ Default' : 'Make Default'
            }))
            .join('');
    }
};