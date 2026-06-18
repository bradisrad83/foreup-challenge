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

    // Track the active AbortController so we can cancel superseded requests
    let abortController = null;

    /**
     * Fetch shows for the given search query (or the initial unfiltered list
     * when query is empty/absent).
     *
     * @param {string} [searchQuery] - optional search string
     */
    async function fetchShows(searchQuery = '') {
        // Cancel any in-flight request
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
            // Defensive cap at 100 (API already enforces this)
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
            // Only clear loading if this controller is still the active one.
            // If a new request was started this controller was already replaced;
            // the new one will clear loading when it finishes.
            if (signal === abortController?.signal) {
                loading.value = false;
            }
        }
    }

    /** Clear the search query and reload the initial unfiltered list. */
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
