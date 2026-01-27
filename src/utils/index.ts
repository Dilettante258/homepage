export function startViewTransition(callback: ViewTransitionUpdateCallback) {
    document.startViewTransition ? document.startViewTransition(callback) : callback();
}