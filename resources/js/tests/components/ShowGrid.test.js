import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useShowsStore } from '../../stores/shows.js';
import ShowGrid from '../../components/shows/ShowGrid.vue';

// Mock api so the store can be imported without hitting the network
vi.mock('../../services/api.js', () => ({
    getShows: vi.fn(),
}));

// Stub child components that have their own complex dependencies so that
// ShowGrid tests focus on ShowGrid's own conditional rendering.
vi.mock('../../components/shows/ShowCard.vue', () => ({
    default: {
        name: 'ShowCard',
        props: ['show'],
        template: '<article data-testid="show-card">{{ show.name }}</article>',
    },
}));

vi.mock('../../components/shows/ShowCardSkeleton.vue', () => ({
    default: {
        name: 'ShowCardSkeleton',
        template: '<div data-testid="skeleton"></div>',
    },
}));

vi.mock('../../components/shared/EmptyState.vue', () => ({
    default: {
        name: 'EmptyState',
        props: ['message'],
        template: '<div data-testid="empty-state">{{ message }}</div>',
    },
}));

vi.mock('../../components/shared/ErrorAlert.vue', () => ({
    default: {
        name: 'ErrorAlert',
        props: ['message'],
        template: '<div data-testid="error-alert">{{ message }}</div>',
    },
}));

function makeShow(id) {
    return {
        external_id: id,
        name: `Show ${id}`,
        image_url: null,
        summary: null,
        premiered: null,
        ended: null,
        status: 'Running',
        genres: [],
        rating: null,
        language: 'English',
        network: null,
        official_url: null,
        metadata: {},
    };
}

describe('ShowGrid component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('shows skeletons when loading', () => {
        const store = useShowsStore();
        store.loading = true;

        const wrapper = mount(ShowGrid);
        expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
        expect(wrapper.find('[data-testid="error-alert"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="show-card"]').exists()).toBe(false);
    });

    it('shows ErrorAlert when there is an error (error takes priority over loading)', () => {
        const store = useShowsStore();
        store.error = 'The show service is temporarily unavailable.';
        store.loading = false;

        const wrapper = mount(ShowGrid);
        const alert = wrapper.find('[data-testid="error-alert"]');
        expect(alert.exists()).toBe(true);
        expect(alert.text()).toBe('The show service is temporarily unavailable.');
        expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="show-card"]').exists()).toBe(false);
    });

    it('shows EmptyState when there are no results and not loading', () => {
        const store = useShowsStore();
        store.results = [];
        store.loading = false;
        store.error = null;

        const wrapper = mount(ShowGrid);
        expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="show-card"]').exists()).toBe(false);
    });

    it('shows a card for each result when results are present', () => {
        const store = useShowsStore();
        store.results = [makeShow(1), makeShow(2), makeShow(3)];
        store.loading = false;
        store.error = null;

        const wrapper = mount(ShowGrid);
        const cards = wrapper.findAll('[data-testid="show-card"]');
        expect(cards).toHaveLength(3);
        expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false);
    });

    it('shows the search query in the empty message when a query is set', () => {
        const store = useShowsStore();
        store.results = [];
        store.loading = false;
        store.error = null;
        store.query = 'xyznotfound';

        const wrapper = mount(ShowGrid);
        const emptyState = wrapper.find('[data-testid="empty-state"]');
        expect(emptyState.text()).toContain('xyznotfound');
    });

    it('shows the generic empty message when no query is set', () => {
        const store = useShowsStore();
        store.results = [];
        store.loading = false;
        store.error = null;
        store.query = '';

        const wrapper = mount(ShowGrid);
        const emptyState = wrapper.find('[data-testid="empty-state"]');
        expect(emptyState.text()).toContain('No shows available');
    });
});
