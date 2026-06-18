import { ref, watch, onUnmounted } from 'vue';

/**
 * Returns a debounced ref that updates `delay` ms after the source ref stops changing.
 *
 * @param {import('vue').Ref} source - the ref to debounce
 * @param {number} [delay=300]       - debounce delay in milliseconds
 * @returns {import('vue').Ref}       debounced value ref
 */
export function useDebounce(source, delay = 300) {
    const debounced = ref(source.value);
    let timer = null;

    const stop = watch(source, (newValue) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            debounced.value = newValue;
            timer = null;
        }, delay);
    });

    onUnmounted(() => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        stop();
    });

    return debounced;
}
