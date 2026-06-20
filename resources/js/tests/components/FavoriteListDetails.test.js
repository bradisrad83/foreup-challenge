import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import FavoriteListDetails from '../../components/favorites/FavoriteListDetails.vue';

// Mock all api calls
vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    getFavoriteList: vi.fn(),
    deleteFavoriteList: vi.fn(),
    removeFavorite: vi.fn(),
}));

import { deleteFavoriteList, removeFavorite } from '../../services/api.js';

// Stub AppDialog to avoid Teleport complexity inside FavoriteListDetails tests;
// ConfirmDialog wraps AppDialog and we stub it directly so we can control visibility.
vi.mock('../../components/shared/AppDialog.vue', () => ({
    default: {
        name: 'AppDialog',
        props: ['open', 'title'],
        emits: ['close'],
        template: `
            <div v-if="open" data-testid="dialog" :data-title="title">
                <slot />
            </div>
        `,
    },
}));

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

function makeFavorite(overrides = {}) {
    return {
        id: 10,
        favorite_list_id: 1,
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

describe('FavoriteListDetails component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------------
    // Loading state
    // -----------------------------------------------------------------------

    it('shows a loading skeleton when selectedListLoading is true', () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = true;
        store.selectedList = null;

        const wrapper = mount(FavoriteListDetails);
        expect(wrapper.find('[aria-label="Loading favorites"]').exists()).toBe(true);
    });

    // -----------------------------------------------------------------------
    // Error state
    // -----------------------------------------------------------------------

    it('shows an error message when selectedListError is set', () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = false;
        store.selectedListError = 'Could not load the list.';

        const wrapper = mount(FavoriteListDetails);
        // ErrorAlert is not stubbed — it renders the message
        expect(wrapper.text()).toContain('Could not load the list.');
    });

    // -----------------------------------------------------------------------
    // Favorites list
    // -----------------------------------------------------------------------

    it('renders one item per favorite when list has favorites', () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = false;
        store.selectedListError = null;
        store.selectedList = {
            ...makeList(),
            favorites: [
                makeFavorite({ id: 10, name: 'Breaking Bad' }),
                makeFavorite({ id: 11, name: 'Ozark', external_id: 200 }),
            ],
        };

        const wrapper = mount(FavoriteListDetails);
        const items = wrapper.findAll('li');
        expect(items).toHaveLength(2);
        expect(wrapper.text()).toContain('Breaking Bad');
        expect(wrapper.text()).toContain('Ozark');
    });

    it('shows empty state message when list has no favorites', () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = false;
        store.selectedListError = null;
        store.selectedList = { ...makeList(), favorites: [] };

        const wrapper = mount(FavoriteListDetails);
        expect(wrapper.text()).toContain('No shows in this list yet.');
    });

    // -----------------------------------------------------------------------
    // Delete confirmation dialog
    // -----------------------------------------------------------------------

    it('delete confirmation dialog is hidden initially', () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = false;
        store.selectedList = { ...makeList(), favorites: [] };

        const wrapper = mount(FavoriteListDetails);
        // ConfirmDialog is open=false by default; our AppDialog stub hides it
        const dialog = wrapper.find('[data-testid="dialog"]');
        expect(dialog.exists()).toBe(false);
    });

    it('clicking the trash button shows the confirmation dialog', async () => {
        const store = useFavoriteListsStore();
        store.selectedListLoading = false;
        store.selectedList = { ...makeList(), favorites: [] };

        const wrapper = mount(FavoriteListDetails);
        const trashBtn = wrapper.find('button[aria-label="Delete this list"]');
        expect(trashBtn.exists()).toBe(true);

        await trashBtn.trigger('click');
        const dialog = wrapper.find('[data-testid="dialog"]');
        expect(dialog.exists()).toBe(true);
    });

    it('confirming delete calls deleteList with the selected list id', async () => {
        const store = useFavoriteListsStore();
        store.selectedListId = 1;
        store.selectedListLoading = false;
        store.selectedList = { ...makeList({ id: 1 }), favorites: [] };
        store.lists = [makeList({ id: 1 })];

        deleteFavoriteList.mockResolvedValueOnce(null);

        const wrapper = mount(FavoriteListDetails);

        // Open confirm dialog
        await wrapper.find('button[aria-label="Delete this list"]').trigger('click');

        // The ConfirmDialog stub renders a Confirm button
        const confirmBtn = wrapper.findAll('button').find(
            (b) => b.text().includes('Delete list'),
        );
        expect(confirmBtn).toBeTruthy();
        await confirmBtn.trigger('click');

        await vi.waitUntil(() => !wrapper.vm.deleteLoading);

        expect(deleteFavoriteList).toHaveBeenCalledWith(1);
    });

    // -----------------------------------------------------------------------
    // RemoveFavoriteButton integration
    // -----------------------------------------------------------------------

    it('remove button calls removeFromList when clicked', async () => {
        const store = useFavoriteListsStore();
        store.selectedListId = 1;
        store.selectedListLoading = false;
        store.selectedListError = null;
        store.selectedList = {
            ...makeList({ id: 1, favorites_count: 1 }),
            favorites: [makeFavorite({ id: 10 })],
        };
        store.lists = [makeList({ id: 1, favorites_count: 1 })];

        removeFavorite.mockResolvedValueOnce(null);

        const wrapper = mount(FavoriteListDetails);

        const removeBtn = wrapper.find('button[aria-label="Remove from list"]');
        expect(removeBtn.exists()).toBe(true);
        await removeBtn.trigger('click');

        await vi.waitUntil(() => removeFavorite.mock.calls.length > 0);
        expect(removeFavorite).toHaveBeenCalledWith(1, 10);
    });
});
