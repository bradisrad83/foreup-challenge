import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import FavoriteCard from '../../components/favorites/FavoriteCard.vue';

vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    getFavoriteList: vi.fn(),
    removeFavorite: vi.fn(),
}));

import { removeFavorite } from '../../services/api.js';

// Stub the details modal — we only care about ShowDetailsModal's open prop here.
vi.mock('../../components/shows/ShowDetailsModal.vue', () => ({
    default: {
        name: 'ShowDetailsModal',
        props: ['open', 'show', 'canAdd', 'canRemove'],
        emits: ['close', 'add-to-list', 'remove'],
        template:
            '<div data-testid="details" :data-open="open" :data-can-add="canAdd" :data-can-remove="canRemove"></div>',
    },
}));

function makeFavorite(overrides = {}) {
    return {
        id: 10,
        favorite_list_id: 1,
        external_id: 169,
        name: 'Breaking Bad',
        image_url: 'https://example.com/p.jpg',
        summary: 'A teacher turns to crime.',
        premiered: '2008-01-20',
        ended: '2013-09-29',
        status: 'Ended',
        genres: ['Drama', 'Crime'],
        rating: 9.2,
        language: 'English',
        network: 'AMC',
        official_url: null,
        metadata: {},
        ...overrides,
    };
}

describe('FavoriteCard component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('renders the show name and meta', () => {
        const wrapper = mount(FavoriteCard, { props: { favorite: makeFavorite() } });
        expect(wrapper.text()).toContain('Breaking Bad');
        expect(wrapper.text()).toContain('AMC');
        expect(wrapper.text()).toContain('2008');
    });

    it('clicking the poster opens the (read-only) details modal', async () => {
        const wrapper = mount(FavoriteCard, { props: { favorite: makeFavorite() } });

        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('false');
        // The details modal is read-only here (no add heart)
        expect(wrapper.find('[data-testid="details"]').attributes('data-can-add')).toBe('false');

        await wrapper.find('button[aria-label^="View details"]').trigger('click');
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');
    });

    it('clicking remove calls the store with this favorite id', async () => {
        const store = useFavoriteListsStore();
        store.selectedListId = 1;
        store.selectedList = { id: 1, favorites_count: 1, favorites: [makeFavorite({ id: 10 })] };
        store.lists = [{ id: 1, favorites_count: 1 }];
        removeFavorite.mockResolvedValueOnce(null);

        const wrapper = mount(FavoriteCard, { props: { favorite: makeFavorite({ id: 10 }) } });

        await wrapper.find('button[aria-label="Remove from list"]').trigger('click');
        await vi.waitUntil(() => removeFavorite.mock.calls.length > 0);

        expect(removeFavorite).toHaveBeenCalledWith(1, 10);
    });

    it('remove from inside the details modal removes the favorite and closes the modal', async () => {
        const store = useFavoriteListsStore();
        store.selectedListId = 1;
        store.selectedList = { id: 1, favorites_count: 1, favorites: [makeFavorite({ id: 10 })] };
        store.lists = [{ id: 1, favorites_count: 1 }];
        removeFavorite.mockResolvedValueOnce(null);

        const wrapper = mount(FavoriteCard, { props: { favorite: makeFavorite({ id: 10 }) } });

        // Open the modal, then have it request a remove
        await wrapper.find('button[aria-label^="View details"]').trigger('click');
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');

        wrapper.findComponent({ name: 'ShowDetailsModal' }).vm.$emit('remove');
        await flushPromises();

        expect(removeFavorite).toHaveBeenCalledWith(1, 10);
        // Modal closed after removal
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('false');
    });
});
