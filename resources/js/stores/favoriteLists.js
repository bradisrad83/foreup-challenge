import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
    getFavoriteLists,
    createFavoriteList,
    getFavoriteList,
    deleteFavoriteList,
    addFavorite,
    removeFavorite,
    getFavoriteIds,
} from '../services/api.js';

/**
 * Pinia store for favorite-list state.
 *
 * Owns:
 * - The full list index (with counts), always ordered alphabetically (as the API returns)
 * - The currently selected list id
 * - The selected list's detail (including its favorites, ordered updated_at desc by the API)
 * - Loading / error state for index and detail fetches
 * - Mutation errors (create, add-to-list, etc.)
 *
 * NOT owned here (kept local to components):
 * - Dialog / confirmation-dialog visibility
 * - Form input values
 * - Which show card opened the selector
 */
export const useFavoriteListsStore = defineStore('favoriteLists', () => {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /** All lists (alphabetical, with counts). */
    const lists = ref([]);
    const listsLoading = ref(false);
    const listsError = ref(null);

    /** Currently selected list id. */
    const selectedListId = ref(null);
    /** Full detail of the selected list (including its favorites). */
    const selectedList = ref(null);
    const selectedListLoading = ref(false);
    const selectedListError = ref(null);

    /**
     * Mutation errors keyed by context.
     * - createError: 422 validation message/errors from POST /favorite-lists
     * - addResults: array of { listId, listName, status, message } after multi-list add
     */
    const createError = ref(null);
    const createErrors = ref(null); // field-level errors object from 422
    const addResults = ref([]); // per-list outcomes after addToLists

    /**
     * Distinct external_ids of every saved show across ALL lists — powers the
     * "favorited" indicator (filled heart) on the browse grid. Loaded on mount
     * and kept in sync after add/remove/delete mutations.
     */
    const favoritedIds = ref([]);

    // -------------------------------------------------------------------------
    // Computed / helpers
    // -------------------------------------------------------------------------

    /** Whether a show (by external_id) is saved in at least one list. */
    function isFavorited(externalId) {
        return favoritedIds.value.includes(externalId);
    }

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    /**
     * Load all lists. Called on mount and after any create/delete mutation.
     */
    async function fetchLists() {
        listsLoading.value = true;
        listsError.value = null;
        try {
            const json = await getFavoriteLists();
            lists.value = json.data || [];
        } catch (err) {
            listsError.value = err.message || 'Could not load your favorite lists.';
        } finally {
            listsLoading.value = false;
        }
    }

    /**
     * Load the set of favorited external_ids (for the filled-heart indicator).
     * Non-critical: a failure just leaves the indicator unchanged.
     */
    async function fetchFavoritedIds() {
        try {
            const json = await getFavoriteIds();
            favoritedIds.value = json.data || [];
        } catch {
            // ignore — only affects the favorited indicator
        }
    }

    /**
     * Create a new list.
     * @param {string} name
     * @returns {object|null} the created list (with id) on success, null on
     *   validation/other error. (Truthy on success, so callers can also use it
     *   as a boolean.)
     */
    async function createList(name) {
        createError.value = null;
        createErrors.value = null;
        try {
            const json = await createFavoriteList({ name });
            const created = { ...json.data };
            // Insert into the local list and re-sort alphabetically so the UI
            // is consistent with the API's ordering without a full re-fetch.
            lists.value = [...lists.value, created].sort((a, b) =>
                a.name.localeCompare(b.name),
            );
            return created;
        } catch (err) {
            createError.value = err.message || 'Could not create the list.';
            createErrors.value = err.errors || null;
            return null;
        }
    }

    /**
     * Select a list by id and load its detail (with favorites).
     * @param {number} id
     */
    async function selectList(id) {
        selectedListId.value = id;
        selectedList.value = null;
        selectedListLoading.value = true;
        selectedListError.value = null;
        try {
            const json = await getFavoriteList(id);
            // Only apply if the selection hasn't changed while we awaited
            if (selectedListId.value === id) {
                selectedList.value = json.data;
            }
        } catch (err) {
            if (selectedListId.value === id) {
                selectedListError.value = err.message || 'Could not load the list.';
            }
        } finally {
            if (selectedListId.value === id) {
                selectedListLoading.value = false;
            }
        }
    }

    /**
     * Deselect the current list (go back to the list index view).
     */
    function deselectList() {
        selectedListId.value = null;
        selectedList.value = null;
        selectedListError.value = null;
    }

    /**
     * Delete a list by id.
     * @param {number} id
     * @returns {boolean} true on success
     */
    async function deleteList(id) {
        try {
            await deleteFavoriteList(id);
            lists.value = lists.value.filter((l) => l.id !== id);
            if (selectedListId.value === id) {
                deselectList();
            }
            // Cascade-deleted favorites may no longer be saved anywhere.
            await fetchFavoritedIds();
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Add a show to one or more lists. Issues one POST per selected list
     * (DECISIONS.md #16). 409 duplicates are reported per list without
     * aborting the others (Promise.allSettled semantics via tracking).
     *
     * Sets `addResults` — an array of { listId, listName, status, message }
     * so the UI can display per-list outcomes.
     *
     * @param {object} show - normalized show object from shows store
     * @param {number[]} listIds - ids of lists to add to
     */
    async function addToLists(show, listIds) {
        addResults.value = [];

        const requests = listIds.map(async (listId) => {
            const listMeta = lists.value.find((l) => l.id === listId);
            const listName = listMeta ? listMeta.name : `List ${listId}`;
            try {
                await addFavorite(listId, show);
                lists.value = lists.value.map((l) =>
                    l.id === listId
                        ? { ...l, favorites_count: (l.favorites_count || 0) + 1 }
                        : l,
                );
                // If it's the open list, refresh its detail so the new card shows.
                if (selectedListId.value === listId && selectedList.value) {
                    await selectList(listId);
                }
                return { listId, listName, status: 'added', message: null };
            } catch (err) {
                if (err.status === 409) {
                    return { listId, listName, status: 'duplicate', message: err.message };
                }
                return {
                    listId,
                    listName,
                    status: 'error',
                    message: err.message || 'Could not save to this list.',
                };
            }
        });

        addResults.value = await Promise.all(requests);

        // The show is now favorited if it landed in (or already existed in) any
        // list — mark it so the heart fills immediately.
        const saved = addResults.value.some(
            (r) => r.status === 'added' || r.status === 'duplicate',
        );
        if (saved && show && show.external_id != null && !isFavorited(show.external_id)) {
            favoritedIds.value = [...favoritedIds.value, show.external_id];
        }
    }

    /**
     * Remove a favorite from the currently selected list.
     * @param {number} favoriteId
     * @returns {boolean} true on success
     */
    async function removeFromList(favoriteId) {
        const listId = selectedListId.value;
        if (listId === null) return false;
        try {
            await removeFavorite(listId, favoriteId);
            if (selectedList.value) {
                selectedList.value = {
                    ...selectedList.value,
                    favorites: (selectedList.value.favorites || []).filter(
                        (f) => f.id !== favoriteId,
                    ),
                    favorites_count: Math.max(
                        0,
                        (selectedList.value.favorites_count || 1) - 1,
                    ),
                };
            }
            lists.value = lists.value.map((l) =>
                l.id === listId
                    ? { ...l, favorites_count: Math.max(0, (l.favorites_count || 1) - 1) }
                    : l,
            );
            // The show may still be in other lists — re-fetch the favorited set
            // so the heart only un-fills when it's gone from every list.
            await fetchFavoritedIds();
            return true;
        } catch (err) {
            return false;
        }
    }

    /** Clear mutation-level errors (e.g. when closing a form). */
    function clearCreateErrors() {
        createError.value = null;
        createErrors.value = null;
    }

    /** Clear add-to-list results (e.g. when re-opening the selector). */
    function clearAddResults() {
        addResults.value = [];
    }

    return {
        // State
        lists,
        listsLoading,
        listsError,
        selectedListId,
        selectedList,
        selectedListLoading,
        selectedListError,
        createError,
        createErrors,
        addResults,
        favoritedIds,
        // Computed / helpers
        isFavorited,
        // Actions
        fetchLists,
        fetchFavoritedIds,
        createList,
        selectList,
        deselectList,
        deleteList,
        addToLists,
        removeFromList,
        clearCreateErrors,
        clearAddResults,
    };
});
