import { useState, useCallback } from 'react';

interface PathSelectorProps {
    onPathSelected: (selector: string) => void;
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

            // First inject the finder script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['finder.js']
            });

            // Then inject our selector script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: initializeSelector,
            });

            // Listen for the result
            const handleMessage = (message: { type: string; selector: string }) => {
                if (message.type === 'ELEMENT_SELECTED') {
                    onPathSelected(message.selector);
                    setIsSelecting(false);
                    chrome.runtime.onMessage.removeListener(handleMessage);

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

function cleanupSelector() {
    const cleanup = new CustomEvent('SELECTOR_CLEANUP');
    document.dispatchEvent(cleanup);
}

function initializeSelector() {
    let highlightedElement: HTMLElement | null = null;

    function handleMouseOver(event: MouseEvent) {
        event.stopPropagation();
        const target = event.target as HTMLElement;

        if (highlightedElement) {
            highlightedElement.style.outline = 'none';
        }

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
            // Use the finder function from the injected script
            const selector = finder(highlightedElement);
            chrome.runtime.sendMessage({
                type: 'ELEMENT_SELECTED',
                selector
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
        document.removeEventListener('SELECTOR_CLEANUP', cleanup);
    }

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('SELECTOR_CLEANUP', cleanup);
}