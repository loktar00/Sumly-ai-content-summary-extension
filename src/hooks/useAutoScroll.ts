import { useEffect, useRef, RefObject } from 'react';

const SCROLL_TOLERANCE = 100;

interface AutoScrollResult {
    ref: RefObject<HTMLDivElement>;
    scrollToBottom: () => void;
}

export const useAutoScroll = (deps: unknown[] = []): AutoScrollResult => {
    const messagesRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        const element = messagesRef.current;
        if (!element) return;

        const isUserScrolledUp =
            element.scrollHeight -
            element.clientHeight -
            element.scrollTop > SCROLL_TOLERANCE;

        if (!isUserScrolledUp) {
            scrollToBottom();
        }
    }, deps);

    return { ref: messagesRef, scrollToBottom };
};