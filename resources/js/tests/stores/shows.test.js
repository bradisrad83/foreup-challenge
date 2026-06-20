import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShowsStore } from '../../stores/shows.js';

// ---------------------------------------------------------------------------
// Mock the api module so no real network calls are made.
// The mock is hoisted by Vitest before imports are evaluated.
// ---------------------------------------------------------------------------
vi.mock('../../services/api.js', () => ({
    getShows: vi.fn(),
}));

import { getShows } from '../../services/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Make a minimal normalized show object as the API returns.
 */
function makeShow(overrides = {}) {
    return {
        external_id: 1,
        name: 'Breaking Bad',
        image_url: 'https://example.com/img.jpg',
        summary: 'A chemistry teacher turns criminal.',
        premiered: '2008-01-20',
        ended: '2013-09-29',
        status: 'Ended',
        genres: ['Drama'],
        rating: 9.2,
        language: 'English',
        network: 'AMC',
        official_url: null,
        metadata: {},
        ...overrides,
    };
}

/**
 * Build a mock API response matching the `{ data: [...] }` contract shape.
 */
function showsResponse(shows) {
    return { data: shows };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shows store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------

    it('starts with empty results, no loading, no error', () => {
        const store = useShowsStore();
        expect(store.results).toEqual([]);
        expect(store.loading).toBe(false);
        expect(store.error).toBeNull();
        expect(store.query).toBe('');
    });

    // -----------------------------------------------------------------------
    // fetchShows — success paths
    // -----------------------------------------------------------------------

    it('populates results on a successful unfiltered fetch', async () => {
        const shows = [makeShow({ external_id: 1 }), makeShow({ external_id: 2, name: 'Ozark' })];
        getShows.mockResolvedValueOnce(showsResponse(shows));

        const store = useShowsStore();
        await store.fetchShows();

        expect(store.results).toEqual(shows);
        expect(store.loading).toBe(false);
        expect(store.error).toBeNull();
    });

    it('passes the search query to getShows', async () => {
        getShows.mockResolvedValueOnce(showsResponse([]));

        const store = useShowsStore();
        await store.fetchShows('breaking');

        expect(getShows).toHaveBeenCalledWith(
            { search: 'breaking' },
            expect.any(AbortSignal),
        );
        expect(store.query).toBe('breaking');
    });

    it('sends no params for an empty query', async () => {
        getShows.mockResolvedValueOnce(showsResponse([]));

        const store = useShowsStore();
        await store.fetchShows('');

        expect(getShows).toHaveBeenCalledWith(
            undefined,
            expect.any(AbortSignal),
        );
    });

    // -----------------------------------------------------------------------
    // Loading flag
    // -----------------------------------------------------------------------

    it('sets loading to true while fetching and false after', async () => {
        let resolveResponse;
        const promise = new Promise((resolve) => {
            resolveResponse = resolve;
        });
        getShows.mockReturnValueOnce(promise);

        const store = useShowsStore();
        const fetchPromise = store.fetchShows();
        expect(store.loading).toBe(true);

        resolveResponse(showsResponse([]));
        await fetchPromise;
        expect(store.loading).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Error state
    // -----------------------------------------------------------------------

    it('sets error and empties results when the API rejects', async () => {
        const apiError = new Error('The show service is temporarily unavailable.');
        apiError.status = 502;
        getShows.mockRejectedValueOnce(apiError);

        const store = useShowsStore();
        await store.fetchShows();

        expect(store.results).toEqual([]);
        expect(store.error).toBe('The show service is temporarily unavailable.');
        expect(store.loading).toBe(false);
    });

    it('falls back to a generic message when err.message is absent', async () => {
        // An error with no .message (rare but defensive)
        const bare = Object.assign(new Error(), { message: '' });
        getShows.mockRejectedValueOnce(bare);

        const store = useShowsStore();
        await store.fetchShows();

        expect(store.error).toBe('Something went wrong. Please try again.');
    });

    // -----------------------------------------------------------------------
    // Empty response
    // -----------------------------------------------------------------------

    it('empty { data: [] } response sets empty results with no error', async () => {
        getShows.mockResolvedValueOnce({ data: [] });

        const store = useShowsStore();
        await store.fetchShows('no-match-query');

        expect(store.results).toEqual([]);
        expect(store.error).toBeNull();
        expect(store.loading).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Defensive 100-cap
    // -----------------------------------------------------------------------

    it('slices results to 100 even if the API returns 101', async () => {
        const shows = Array.from({ length: 101 }, (_, i) =>
            makeShow({ external_id: i + 1, name: `Show ${i + 1}` }),
        );
        getShows.mockResolvedValueOnce(showsResponse(shows));

        const store = useShowsStore();
        await store.fetchShows();

        expect(store.results).toHaveLength(100);
    });

    // -----------------------------------------------------------------------
    // Stale-response discard (AbortController / latest-query-wins)
    // -----------------------------------------------------------------------

    it('discards the first response when a second fetch is started before the first resolves', async () => {
        // We need deterministic control: first request never resolves naturally;
        // the second request resolves immediately with the correct data.
        // When the second fetchShows() is called, the first AbortController
        // is aborted, causing the first promise to reject with an AbortError.

        const abortError = new Error('The operation was aborted.');
        abortError.name = 'AbortError';

        let abortFirstRequest;
        const firstRequestPromise = new Promise((_, reject) => {
            abortFirstRequest = () => reject(abortError);
        });

        // First call returns a promise that we can abort
        getShows.mockReturnValueOnce(firstRequestPromise);
        // Second call resolves with the correct data immediately
        const secondShows = [makeShow({ external_id: 99, name: 'Second Query Show' })];
        getShows.mockResolvedValueOnce(showsResponse(secondShows));

        const store = useShowsStore();

        // Start the first request (does NOT await)
        const firstFetch = store.fetchShows('first');

        // Immediately abort the first and start the second
        abortFirstRequest();
        const secondFetch = store.fetchShows('second');

        // Wait for both to settle
        await Promise.allSettled([firstFetch, secondFetch]);

        // Only the second query's results should be in the store
        expect(store.results).toEqual(secondShows);
        expect(store.query).toBe('second');
        expect(store.error).toBeNull();
    });

    // -----------------------------------------------------------------------
    // clearSearch
    // -----------------------------------------------------------------------

    it('clearSearch resets the query and re-fetches the unfiltered list', async () => {
        // First fetch for a search
        getShows.mockResolvedValueOnce(showsResponse([makeShow()]));
        // Second fetch (clearSearch) returns a fresh unfiltered list
        const unfilteredShows = [makeShow({ external_id: 2, name: 'Ozark' })];
        getShows.mockResolvedValueOnce(showsResponse(unfilteredShows));

        const store = useShowsStore();
        await store.fetchShows('breaking');
        expect(store.query).toBe('breaking');

        await store.clearSearch();

        expect(store.query).toBe('');
        expect(store.results).toEqual(unfilteredShows);
        expect(getShows).toHaveBeenCalledTimes(2);
        // The second call should have no params (unfiltered)
        expect(getShows).toHaveBeenNthCalledWith(2, undefined, expect.any(AbortSignal));
    });

    it('clearSearch clears a previous error', async () => {
        const apiError = new Error('502');
        apiError.status = 502;
        getShows.mockRejectedValueOnce(apiError);
        getShows.mockResolvedValueOnce(showsResponse([]));

        const store = useShowsStore();
        await store.fetchShows();
        expect(store.error).toBeTruthy();

        await store.clearSearch();
        expect(store.error).toBeNull();
    });
});
