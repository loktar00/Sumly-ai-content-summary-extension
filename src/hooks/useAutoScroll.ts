import { useEffect, useRef } from 'react';

const SCROLL_TOLERANCE = 100;

export const useAutoScroll = (deps: any[] = []) => {
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = messagesRef.current;
        if (!element) return;

        const isUserScrolledUp =
            element.scrollHeight -
            element.clientHeight -
            element.scrollTop > SCROLL_TOLERANCE;

        if (!isUserScrolledUp) {
            element.scrollTop = element.scrollHeight;
        }
    }, deps);

    return messagesRef;
};