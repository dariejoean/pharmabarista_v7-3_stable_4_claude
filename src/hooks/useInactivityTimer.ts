import { useEffect, useCallback } from 'react';

export const useInactivityTimer = (onTimeout: () => void, timeoutMs: number = 300000) => {
    const resetTimer = useCallback(() => {
        // Reset logic
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(onTimeout, timeoutMs);
        };

        events.forEach(event => window.addEventListener(event, reset));
        reset();

        return () => {
            events.forEach(event => window.removeEventListener(event, reset));
            clearTimeout(timer);
        };
    }, [onTimeout, timeoutMs]);
};
