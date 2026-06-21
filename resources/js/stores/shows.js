import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getShows } from '../services/api.js';

/**
 * Pinia store for show search state.
 *
 * Owns: search query, results, loading state, error state.
 * Enforces: AbortController-based stale-response protection (latest query wins).
 * Results cap: the API already caps at 100, but we slice defensively here too.
 */
export const useShowsStore = defineStore('shows', () => {
    const query = ref('');
    const results = ref([]);
    const loading = ref(false);
    const error = ref(null);

    let abortController = null;

    /**
     * Fetch shows for the given search query (or the initial unfiltered list
     * when query is empty/absent).
     *
     * @param {string} [searchQuery] - optional search string
     */
    async function fetchShows(searchQuery = '') {
        if (abortController !== null) {
            abortController.abort();
        }
        abortController = new AbortController();

        query.value = searchQuery;
        loading.value = true;
        error.value = null;

        const params = searchQuery ? { search: searchQuery } : undefined;
        const signal = abortController.signal;

        try {
            const json = await getShows(params, signal);
            results.value = (json.data || []).slice(0, 100);
            error.value = null;
        } catch (err) {
            if (err.name === 'AbortError') {
                // Request was superseded — do not update state
                return;
            }
            results.value = [];
            error.value = err.message || 'Something went wrong. Please try again.';
        } finally {
            // Only clear loading if this request is still the active one; a newer
            // request will have replaced the controller and owns the loading flag.
            if (signal === abortController?.signal) {
                loading.value = false;
            }
        }
    }

    /** Reset to the initial unfiltered list (clears any active search). */
    function clearSearch() {
        fetchShows('');
    }

    return {
        query,
        results,
        loading,
        error,
        fetchShows,
        clearSearch,
    };
});
