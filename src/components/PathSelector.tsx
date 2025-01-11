import { useState, useCallback } from 'react';

interface PathSelectorProps {
    onPathSelected: (xpath: string) => void;
}

export const PathSelector = ({ onPathSelected }: PathSelectorProps) => {
    const [isSelecting, setIsSelecting] = useState(false);

    const startSelection = useCallback(async () => {
        try {
            setIsSelecting(true);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab?.id) {
                throw new Error('No active tab found');
            }

            // Inject the selection script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: initializeSelector,
            });

            // Listen for the result
            const handleMessage = (message: { type: string; xpath: string }) => {
                if (message.type === 'XPATH_SELECTED') {
                    onPathSelected(message.xpath);
                    setIsSelecting(false);
                    chrome.runtime.onMessage.removeListener(handleMessage);

                    // Clean up the injected script
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id as number },
                        func: cleanupSelector
                    });
                }
            };

            chrome.runtime.onMessage.addListener(handleMessage);

        } catch (error) {
            console.error('Error starting selection:', error);
            setIsSelecting(false);
        }
    }, [onPathSelected]);

    return (
        <button
            className={`btn ${isSelecting ? 'selecting' : ''}`}
            onClick={startSelection}
            disabled={isSelecting}>
            {isSelecting ? 'Selecting...' : 'Select Element'}
        </button>
    );
};

// Cleanup function to be injected
function cleanupSelector() {
    const cleanup = new CustomEvent('XPATH_SELECTOR_CLEANUP');
    document.dispatchEvent(cleanup);
}

// This function will be injected into the page
function initializeSelector() {
    let highlightedElement: HTMLElement | null = null;

    function getXPath(element: HTMLElement): string {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        if (element === document.body) {
            return '/html/body';
        }

        const siblings = element.parentNode?.childNodes;
        let count = 1;
        if (siblings) {
            for (let i = 0; i < siblings.length; i++) {
                const sibling = siblings[i];
                if (sibling === element) {
                    return getXPath(element.parentNode as HTMLElement) +
                           '/' + element.tagName.toLowerCase() +
                           '[' + count + ']';
                } else if (
                    sibling.nodeType === 1 &&
                    (sibling as HTMLElement).tagName === element.tagName
                ) {
                    count++;
                }
            }
        }
        return '';
    }

    function handleMouseOver(event: MouseEvent) {
        event.stopPropagation();
        const target = event.target as HTMLElement;

        // Remove previous highlight
        if (highlightedElement) {
            highlightedElement.style.outline = 'none';
        }

        // Highlight new element
        highlightedElement = target;
        target.style.outline = '2px solid #00ff00';
    }

    function handleMouseOut(event: MouseEvent) {
        event.stopPropagation();
        if (highlightedElement) {
            highlightedElement.style.outline = 'none';
            highlightedElement = null;
        }
    }

    function handleClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (highlightedElement) {
            const xpath = getXPath(highlightedElement);
            chrome.runtime.sendMessage({
                type: 'XPATH_SELECTED',
                xpath
            });

            cleanup();
        }
    }

    function cleanup() {
        if (highlightedElement) {
            highlightedElement.style.outline = 'none';
        }
        document.removeEventListener('mouseover', handleMouseOver, true);
        document.removeEventListener('mouseout', handleMouseOut, true);
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('XPATH_SELECTOR_CLEANUP', cleanup);
    }

    // Add event listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('XPATH_SELECTOR_CLEANUP', cleanup);
}