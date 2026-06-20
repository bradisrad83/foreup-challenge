import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import FavoriteListSelector from '../../components/favorites/FavoriteListSelector.vue';

// Mock api
vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    createFavoriteList: vi.fn(),
    addFavorite: vi.fn(),
}));

import { addFavorite, createFavoriteList } from '../../services/api.js';

function makeList(overrides = {}) {
    return {
        id: 1,
        name: 'Drama Picks',
        favorites_count: 2,
        created_at: '2026-06-19T00:00:00Z',
        updated_at: '2026-06-19T00:00:00Z',
        ...overrides,
    };
}

function makeShow(overrides = {}) {
    return {
        external_id: 169,
        name: 'Breaking Bad',
        image_url: null,
        summary: null,
        premiered: null,
        ended: null,
        status: 'Ended',
        genres: [],
        rating: null,
        language: 'English',
        network: null,
        official_url: null,
        metadata: {},
        ...overrides,
    };
}

/**
 * Mount FavoriteListSelector inside a thin parent so we can:
 * - track @close emits via parent state
 * - control :open via parent data
 *
 * FavoriteListSelector uses Teleport via AppDialog; the dialog content lands in
 * document.body, so attachTo: document.body is required. We query rendered
 * content via document.querySelector rather than wrapper.find for Teleport'd DOM.
 */
function mountInParent(initialOpen, storeSetup = null) {
    if (storeSetup) storeSetup();

    const Parent = {
        components: { FavoriteListSelector },
        template: `
            <FavoriteListSelector
                :open="open"
                :show="show"
                @close="closed = true"
            />
        `,
        data() {
            return {
                open: initialOpen,
                show: makeShow(),
                closed: false,
            };
        },
    };

    return mount(Parent, { attachTo: document.body });
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('FavoriteListSelector component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Open/close reset behaviour
    // -----------------------------------------------------------------------

    it('resets addResults when dialog is opened', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1 })];
        store.addResults = [{ listId: 1, listName: 'Drama Picks', status: 'added', message: null }];

        const parent = mountInParent(false);

        // Open the dialog (transition from false → true triggers the watcher)
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        expect(store.addResults).toEqual([]);
        parent.unmount();
    });

    // -----------------------------------------------------------------------
    // Save button disabled when nothing is checked
    // -----------------------------------------------------------------------

    it('Save button is disabled when no lists are checked', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1 })];

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const buttons = document.querySelectorAll('button');
        const saveBtn = Array.from(buttons).find(
            (b) => b.textContent.trim().startsWith('Add to'),
        );
        expect(saveBtn).toBeTruthy();
        expect(saveBtn.disabled).toBe(true);
        parent.unmount();
    });

    it('Save button is enabled after selecting a list', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1 })];

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const checkbox = document.querySelector('input[type="checkbox"]');
        expect(checkbox).not.toBeNull();
        checkbox.click();
        await parent.vm.$nextTick();

        const saveBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim().startsWith('Add to'),
        );
        expect(saveBtn.disabled).toBe(false);
        parent.unmount();
    });

    // -----------------------------------------------------------------------
    // Per-list result icons after save
    // -----------------------------------------------------------------------

    it('shows success result after adding to a list', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1, name: 'Drama Picks' })];

        addFavorite.mockResolvedValueOnce({ data: { id: 10 } });

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const checkbox = document.querySelector('input[type="checkbox"]');
        checkbox.click();
        await parent.vm.$nextTick();

        const saveBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim().startsWith('Add to'),
        );
        saveBtn.click();
        await parent.vm.$nextTick();
        await vi.waitUntil(() => store.addResults.length > 0);

        expect(store.addResults[0].status).toBe('added');
        parent.unmount();
    });

    it('shows duplicate result when 409 is returned for a list', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1, name: 'Drama Picks' })];

        const dupError = Object.assign(new Error('This show is already in the list.'), { status: 409 });
        addFavorite.mockRejectedValueOnce(dupError);

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const checkbox = document.querySelector('input[type="checkbox"]');
        checkbox.click();
        await parent.vm.$nextTick();

        const saveBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim().startsWith('Add to'),
        );
        saveBtn.click();
        await parent.vm.$nextTick();
        await vi.waitUntil(() => store.addResults.length > 0);

        expect(store.addResults[0].status).toBe('duplicate');
        parent.unmount();
    });

    // -----------------------------------------------------------------------
    // Inline create path
    // -----------------------------------------------------------------------

    it('opens directly into create form when there are no lists', async () => {
        const store = useFavoriteListsStore();
        store.lists = [];

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        // Extra tick for nextTick inside enableCreate (focus call)
        await parent.vm.$nextTick();

        // The create input should be rendered (no lists → enableCreate called on open)
        const createInput = document.querySelector('input#selector-new-list');
        expect(createInput).not.toBeNull();
        parent.unmount();
    });

    it('clicking New list shows the inline create form when lists exist', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1 })];

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const newListBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim() === 'New list',
        );
        expect(newListBtn).not.toBeNull();
        newListBtn.click();
        await parent.vm.$nextTick();

        const createInput = document.querySelector('input#selector-new-list');
        expect(createInput).not.toBeNull();
        parent.unmount();
    });

    it('inline create auto-selects the new list after creation', async () => {
        const store = useFavoriteListsStore();
        store.lists = [];

        const newList = makeList({ id: 5, name: 'New One' });
        createFavoriteList.mockResolvedValueOnce({ data: newList });

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick(); // after enableCreate nextTick

        // The create form is open because lists is empty
        const createInput = document.querySelector('input#selector-new-list');
        expect(createInput).not.toBeNull();

        // Set the input value via Vue's v-model-compatible approach
        createInput.value = 'New One';
        createInput.dispatchEvent(new Event('input', { bubbles: true }));
        await parent.vm.$nextTick();

        const createBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim() === 'Create & select',
        );
        expect(createBtn).not.toBeNull();
        createBtn.click();
        await parent.vm.$nextTick();

        // Wait for the async create to finish
        await vi.waitUntil(() => createFavoriteList.mock.calls.length > 0);
        await vi.waitUntil(() => store.lists.length > 0);

        expect(store.lists.some((l) => l.id === 5)).toBe(true);
        parent.unmount();
    });

    // -----------------------------------------------------------------------
    // Close behaviour
    // -----------------------------------------------------------------------

    it('emits close when the Cancel button is clicked', async () => {
        const store = useFavoriteListsStore();
        store.lists = [makeList({ id: 1 })];

        const parent = mountInParent(false);
        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const cancelBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim() === 'Cancel',
        );
        expect(cancelBtn).not.toBeNull();
        cancelBtn.click();
        await parent.vm.$nextTick();

        expect(parent.vm.closed).toBe(true);
        parent.unmount();
    });
});
