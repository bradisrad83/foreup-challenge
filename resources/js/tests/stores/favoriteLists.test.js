import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';

// ---------------------------------------------------------------------------
// Mock the api module — no real network calls
// ---------------------------------------------------------------------------
vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    createFavoriteList: vi.fn(),
    getFavoriteList: vi.fn(),
    deleteFavoriteList: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
}));

import {
    getFavoriteLists,
    createFavoriteList,
    getFavoriteList,
    deleteFavoriteList,
    addFavorite,
    removeFavorite,
} from '../../services/api.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeList(overrides = {}) {
    return {
        id: 1,
        name: 'Drama Picks',
        favorites_count: 0,
        created_at: '2026-06-18T00:00:00Z',
        updated_at: '2026-06-18T00:00:00Z',
        ...overrides,
    };
}

function makeFavorite(overrides = {}) {
    return {
        id: 10,
        favorite_list_id: 1,
        external_id: 169,
        name: 'Breaking Bad',
        image_url: 'https://example.com/img.jpg',
        summary: 'A chemistry teacher.',
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

function makeShow(overrides = {}) {
    return {
        external_id: 169,
        name: 'Breaking Bad',
        image_url: 'https://example.com/img.jpg',
        summary: 'A chemistry teacher.',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('favoriteLists store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------

    it('starts with empty lists, no loading, no error, nothing selected', () => {
        const store = useFavoriteListsStore();
        expect(store.lists).toEqual([]);
        expect(store.listsLoading).toBe(false);
        expect(store.listsError).toBeNull();
        expect(store.selectedListId).toBeNull();
        expect(store.selectedList).toBeNull();
        expect(store.addResults).toEqual([]);
        expect(store.createErrors).toBeNull();
    });

    // -----------------------------------------------------------------------
    // fetchLists
    // -----------------------------------------------------------------------

    it('populates lists on successful fetch', async () => {
        const lists = [makeList({ id: 1, name: 'Alpha' }), makeList({ id: 2, name: 'Beta' })];
        getFavoriteLists.mockResolvedValueOnce({ data: lists });

        const store = useFavoriteListsStore();
        await store.fetchLists();

        expect(store.lists).toEqual(lists);
        expect(store.listsLoading).toBe(false);
        expect(store.listsError).toBeNull();
    });

    it('sets listsLoading true during fetch and false after', async () => {
        let resolve;
        const promise = new Promise((r) => { resolve = r; });
        getFavoriteLists.mockReturnValueOnce(promise);

        const store = useFavoriteListsStore();
        const fetchPromise = store.fetchLists();
        expect(store.listsLoading).toBe(true);

        resolve({ data: [] });
        await fetchPromise;
        expect(store.listsLoading).toBe(false);
    });

    it('sets listsError when fetch fails', async () => {
        getFavoriteLists.mockRejectedValueOnce(new Error('Network error'));

        const store = useFavoriteListsStore();
        await store.fetchLists();

        expect(store.listsError).toBe('Network error');
        expect(store.lists).toEqual([]);
    });

    // -----------------------------------------------------------------------
    // createList
    // -----------------------------------------------------------------------

    it('inserts the new list alphabetically and returns it', async () => {
        const existing = makeList({ id: 1, name: 'Zebra List' });
        const created = makeList({ id: 2, name: 'Alpha List', favorites_count: 0 });

        getFavoriteLists.mockResolvedValueOnce({ data: [existing] });
        createFavoriteList.mockResolvedValueOnce({ data: created });

        const store = useFavoriteListsStore();
        await store.fetchLists();

        const result = await store.createList('Alpha List');

        expect(result).toBeTruthy();
        expect(result.name).toBe('Alpha List');
        // Alpha List should come before Zebra List
        expect(store.lists[0].name).toBe('Alpha List');
        expect(store.lists[1].name).toBe('Zebra List');
    });

    it('returns null and sets createErrors on a 422 duplicate name', async () => {
        const err = Object.assign(new Error('A list with this name already exists.'), {
            status: 422,
            errors: { name: ['A list with this name already exists.'] },
        });
        createFavoriteList.mockRejectedValueOnce(err);

        const store = useFavoriteListsStore();
        const result = await store.createList('My List');

        expect(result).toBeNull();
        expect(store.createErrors).toEqual({ name: ['A list with this name already exists.'] });
        expect(store.createError).toBe('A list with this name already exists.');
    });

    // -----------------------------------------------------------------------
    // selectList
    // -----------------------------------------------------------------------

    it('populates selectedList on successful load', async () => {
        const list = { ...makeList({ id: 5 }), favorites: [makeFavorite()] };
        getFavoriteList.mockResolvedValueOnce({ data: list });

        const store = useFavoriteListsStore();
        await store.selectList(5);

        expect(store.selectedListId).toBe(5);
        expect(store.selectedList).toEqual(list);
        expect(store.selectedListLoading).toBe(false);
        expect(store.selectedListError).toBeNull();
    });

    it('sets selectedListError when detail load fails', async () => {
        getFavoriteList.mockRejectedValueOnce(new Error('Not found'));

        const store = useFavoriteListsStore();
        await store.selectList(99);

        expect(store.selectedListError).toBe('Not found');
        expect(store.selectedListLoading).toBe(false);
    });

    it('discards the response when selectedListId changes mid-flight (stale guard)', async () => {
        // First selectList(1) starts, then selectList(2) supersedes it.
        // The first response should be discarded.
        let resolveFirst;
        const firstPromise = new Promise((r) => { resolveFirst = r; });
        const firstDetail = { ...makeList({ id: 1 }), favorites: [] };
        const secondDetail = { ...makeList({ id: 2, name: 'Second' }), favorites: [] };

        getFavoriteList
            .mockReturnValueOnce(firstPromise)
            .mockResolvedValueOnce({ data: secondDetail });

        const store = useFavoriteListsStore();

        const p1 = store.selectList(1); // starts, doesn't resolve yet
        const p2 = store.selectList(2); // supersedes it

        // Now resolve the first request (stale)
        resolveFirst({ data: firstDetail });

        await Promise.all([p1, p2]);

        // The second selection wins
        expect(store.selectedListId).toBe(2);
        expect(store.selectedList).toEqual(secondDetail);
    });

    // -----------------------------------------------------------------------
    // deleteList
    // -----------------------------------------------------------------------

    it('removes the deleted list from lists and returns true', async () => {
        const list1 = makeList({ id: 1, name: 'Alpha' });
        const list2 = makeList({ id: 2, name: 'Beta' });
        getFavoriteLists.mockResolvedValueOnce({ data: [list1, list2] });
        deleteFavoriteList.mockResolvedValueOnce(null); // 204 → null

        const store = useFavoriteListsStore();
        await store.fetchLists();

        const result = await store.deleteList(1);

        expect(result).toBe(true);
        expect(store.lists).toHaveLength(1);
        expect(store.lists[0].id).toBe(2);
    });

    it('deselects the list when the selected list is deleted', async () => {
        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 3 })] });
        getFavoriteList.mockResolvedValueOnce({ data: { ...makeList({ id: 3 }), favorites: [] } });
        deleteFavoriteList.mockResolvedValueOnce(null);

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.selectList(3);
        expect(store.selectedListId).toBe(3);

        await store.deleteList(3);

        expect(store.selectedListId).toBeNull();
        expect(store.selectedList).toBeNull();
    });

    it('returns false when deleteList fails', async () => {
        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 1 })] });
        deleteFavoriteList.mockRejectedValueOnce(new Error('Server error'));

        const store = useFavoriteListsStore();
        await store.fetchLists();
        const result = await store.deleteList(1);

        expect(result).toBe(false);
        // List should still be there
        expect(store.lists).toHaveLength(1);
    });

    // -----------------------------------------------------------------------
    // addToLists
    // -----------------------------------------------------------------------

    it('issues one addFavorite call per list and increments counts on success', async () => {
        const list1 = makeList({ id: 1, name: 'List A', favorites_count: 2 });
        const list2 = makeList({ id: 2, name: 'List B', favorites_count: 0 });
        getFavoriteLists.mockResolvedValueOnce({ data: [list1, list2] });
        addFavorite.mockResolvedValue({ data: makeFavorite() });

        const store = useFavoriteListsStore();
        await store.fetchLists();

        const show = makeShow();
        await store.addToLists(show, [1, 2]);

        expect(addFavorite).toHaveBeenCalledTimes(2);
        expect(addFavorite).toHaveBeenCalledWith(1, show);
        expect(addFavorite).toHaveBeenCalledWith(2, show);

        const updatedList1 = store.lists.find((l) => l.id === 1);
        const updatedList2 = store.lists.find((l) => l.id === 2);
        expect(updatedList1.favorites_count).toBe(3);
        expect(updatedList2.favorites_count).toBe(1);
    });

    it('captures a 409 as a duplicate result without aborting others', async () => {
        const list1 = makeList({ id: 1, name: 'List A', favorites_count: 1 });
        const list2 = makeList({ id: 2, name: 'List B', favorites_count: 0 });
        getFavoriteLists.mockResolvedValueOnce({ data: [list1, list2] });

        const duplicateError = Object.assign(new Error('This show is already in the list.'), {
            status: 409,
        });
        addFavorite
            .mockRejectedValueOnce(duplicateError) // list 1: 409
            .mockResolvedValueOnce({ data: makeFavorite() }); // list 2: success

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.addToLists(makeShow(), [1, 2]);

        expect(store.addResults).toHaveLength(2);
        const result1 = store.addResults.find((r) => r.listId === 1);
        const result2 = store.addResults.find((r) => r.listId === 2);
        expect(result1.status).toBe('duplicate');
        expect(result2.status).toBe('added');
        // Count for the duplicate list should NOT be incremented
        expect(store.lists.find((l) => l.id === 1).favorites_count).toBe(1);
        // Count for the success list should be incremented
        expect(store.lists.find((l) => l.id === 2).favorites_count).toBe(1);
    });

    it('captures a generic error per list without crashing', async () => {
        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 1 })] });
        const serverError = Object.assign(new Error('Internal server error'), { status: 500 });
        addFavorite.mockRejectedValueOnce(serverError);

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.addToLists(makeShow(), [1]);

        expect(store.addResults[0].status).toBe('error');
    });

    // -----------------------------------------------------------------------
    // removeFromList
    // -----------------------------------------------------------------------

    it('removes the favorite and decrements counts', async () => {
        const list = { ...makeList({ id: 1, favorites_count: 2 }), favorites: [] };
        const favorite = makeFavorite({ id: 10 });
        const listWithFavorites = { ...list, favorites: [favorite, makeFavorite({ id: 11, external_id: 200 })] };

        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 1, favorites_count: 2 })] });
        getFavoriteList.mockResolvedValueOnce({ data: listWithFavorites });
        removeFavorite.mockResolvedValueOnce(null); // 204

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.selectList(1);

        const result = await store.removeFromList(10);

        expect(result).toBe(true);
        expect(store.selectedList.favorites).toHaveLength(1);
        expect(store.selectedList.favorites[0].id).toBe(11);
        expect(store.selectedList.favorites_count).toBe(1);
        expect(store.lists.find((l) => l.id === 1).favorites_count).toBe(1);
    });

    it('returns false when removeFromList fails', async () => {
        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 1, favorites_count: 1 })] });
        getFavoriteList.mockResolvedValueOnce({ data: { ...makeList({ id: 1, favorites_count: 1 }), favorites: [makeFavorite()] } });
        removeFavorite.mockRejectedValueOnce(new Error('Not found'));

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.selectList(1);
        const result = await store.removeFromList(10);

        expect(result).toBe(false);
    });

    it('returns false when no list is selected', async () => {
        const store = useFavoriteListsStore();
        const result = await store.removeFromList(10);
        expect(result).toBe(false);
    });

    // -----------------------------------------------------------------------
    // clearCreateErrors / clearAddResults
    // -----------------------------------------------------------------------

    it('clearCreateErrors resets both createError and createErrors', async () => {
        const err = Object.assign(new Error('duplicate'), {
            status: 422,
            errors: { name: ['duplicate'] },
        });
        createFavoriteList.mockRejectedValueOnce(err);

        const store = useFavoriteListsStore();
        await store.createList('My List');
        expect(store.createError).toBeTruthy();
        expect(store.createErrors).toBeTruthy();

        store.clearCreateErrors();
        expect(store.createError).toBeNull();
        expect(store.createErrors).toBeNull();
    });

    it('clearAddResults empties the addResults array', async () => {
        getFavoriteLists.mockResolvedValueOnce({ data: [makeList({ id: 1 })] });
        addFavorite.mockResolvedValueOnce({ data: makeFavorite() });

        const store = useFavoriteListsStore();
        await store.fetchLists();
        await store.addToLists(makeShow(), [1]);
        expect(store.addResults).toHaveLength(1);

        store.clearAddResults();
        expect(store.addResults).toEqual([]);
    });
});
