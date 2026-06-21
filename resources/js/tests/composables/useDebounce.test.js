import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useDebounce } from '../../composables/useDebounce.js';

/**
 * useDebounce must be called inside a Vue component lifecycle because it uses
 * onUnmounted. We test it via a synthetic Pinia-free reactive context, which
 * is sufficient for testing the timing behaviour.
 *
 * Important: we use vi.useFakeTimers() so delay-based assertions are
 * deterministic — no real sleeps.
 */

describe('useDebounce composable', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('debounced ref matches the initial source value immediately', () => {
        const source = ref('hello');
        const debounced = useDebounce(source, 300);
        expect(debounced.value).toBe('hello');
    });

    it('does NOT update immediately when the source changes', async () => {
        const source = ref('');
        const debounced = useDebounce(source, 300);

        source.value = 'typing';
        await nextTick();

        // Still the old value — timer hasn't fired
        expect(debounced.value).toBe('');
    });

    it('updates after the full delay has elapsed', async () => {
        const source = ref('');
        const debounced = useDebounce(source, 300);

        source.value = 'breaking';
        await nextTick();
        expect(debounced.value).toBe('');

        vi.advanceTimersByTime(300);
        await nextTick();

        expect(debounced.value).toBe('breaking');
    });

    it('does not update before the delay when changed before the timer fires', async () => {
        const source = ref('');
        const debounced = useDebounce(source, 300);

        source.value = 'first';
        await nextTick();

        // Advance only 200 ms — timer should not have fired
        vi.advanceTimersByTime(200);
        await nextTick();
        expect(debounced.value).toBe('');
    });

    it('rapid changes produce a single trailing update (trailing-edge debounce)', async () => {
        const source = ref('');
        const debounced = useDebounce(source, 300);

        source.value = 'b';
        await nextTick();
        vi.advanceTimersByTime(100);

        source.value = 'br';
        await nextTick();
        vi.advanceTimersByTime(100);

        source.value = 'bre';
        await nextTick();
        vi.advanceTimersByTime(100);

        // Total 300 ms elapsed but each change restarted the timer —
        // the debounced value should still be the initial ''
        expect(debounced.value).toBe('');

        // Now let the final timer fire
        vi.advanceTimersByTime(300);
        await nextTick();

        expect(debounced.value).toBe('bre');
    });

    it('a custom delay of 100 ms works correctly', async () => {
        const source = ref('');
        const debounced = useDebounce(source, 100);

        source.value = 'fast';
        await nextTick();
        vi.advanceTimersByTime(100);
        await nextTick();

        expect(debounced.value).toBe('fast');
    });
});
