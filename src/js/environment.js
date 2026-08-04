export const isCoarsePointer = window.matchMedia &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export function prefersReducedMotion() {
    return window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollBehaviorPreference() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
}

export function smoothScrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: scrollBehaviorPreference(), block: 'start' });
}
