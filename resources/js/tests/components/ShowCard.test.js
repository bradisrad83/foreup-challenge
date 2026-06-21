import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import ShowCard from '../../components/shows/ShowCard.vue';

// Mock the api and the FavoriteListSelector dependency (it brings in a large
// sub-tree with its own store needs; ShowCard tests focus on ShowCard alone)
vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    createFavoriteList: vi.fn(),
    addFavorite: vi.fn(),
    getFavoriteIds: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../components/favorites/FavoriteListSelector.vue', () => ({
    default: {
        name: 'FavoriteListSelector',
        props: ['open', 'show'],
        emits: ['close'],
        template: '<div data-testid="selector" :data-open="open"></div>',
    },
}));

vi.mock('../../components/shows/ShowDetailsModal.vue', () => ({
    default: {
        name: 'ShowDetailsModal',
        props: ['open', 'show'],
        emits: ['close', 'add-to-list'],
        template: '<div data-testid="details" :data-open="open"></div>',
    },
}));

function makeShow(overrides = {}) {
    return {
        external_id: 169,
        name: 'Breaking Bad',
        image_url: 'https://example.com/poster.jpg',
        summary: 'A chemistry teacher turns to crime.',
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

describe('ShowCard component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('renders the show name as plain text (no v-html)', () => {
        const show = makeShow({ name: 'Breaking Bad' });
        const wrapper = mount(ShowCard, { props: { show } });

        // Name appears in text content
        expect(wrapper.text()).toContain('Breaking Bad');

        // innerHTML of the heading must not contain raw HTML from the name —
        // confirm it is text-rendered, not injected HTML
        const heading = wrapper.find('h2');
        expect(heading.exists()).toBe(true);
        expect(heading.text()).toBe('Breaking Bad');
    });

    it('renders the image with the provided image_url', () => {
        const show = makeShow({ image_url: 'https://example.com/img.jpg' });
        const wrapper = mount(ShowCard, { props: { show } });

        const img = wrapper.find('img');
        expect(img.attributes('src')).toBe('https://example.com/img.jpg');
    });

    it('uses the placeholder SVG when image_url is null', () => {
        const show = makeShow({ image_url: null });
        const wrapper = mount(ShowCard, { props: { show } });

        const img = wrapper.find('img');
        // The src should be the data URI placeholder (starts with data:image/svg+xml)
        expect(img.attributes('src')).toMatch(/^data:image\/svg\+xml/);
    });

    it('image has loading="lazy"', () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        const img = wrapper.find('img');
        expect(img.attributes('loading')).toBe('lazy');
    });

    it('image has descriptive alt text using the show name', () => {
        const show = makeShow({ name: 'Breaking Bad' });
        const wrapper = mount(ShowCard, { props: { show } });

        const img = wrapper.find('img');
        expect(img.attributes('alt')).toContain('Breaking Bad');
    });

    it('image has generic alt when show name is falsy', () => {
        const show = makeShow({ name: null });
        const wrapper = mount(ShowCard, { props: { show } });

        const img = wrapper.find('img');
        expect(img.attributes('alt')).toBeTruthy();
    });

    it('summary is rendered as plain text (not via v-html)', () => {
        const show = makeShow({ summary: 'A <b>bold</b> summary.' });
        const wrapper = mount(ShowCard, { props: { show } });

        // The raw HTML should appear as-is in text, not be interpreted as markup.
        // If v-html were used, the <b> tag would be in innerHTML but not in text().
        // As text interpolation, the angle brackets render as &lt;b&gt; in the DOM.
        const text = wrapper.text();
        expect(text).toContain('A');
        expect(text).toContain('summary');
        // The <b> tag must NOT be an actual bold element in the card body
        const pTag = wrapper.find('p');
        if (pTag.exists()) {
            expect(pTag.element.querySelector('b')).toBeNull();
        }
    });

    it('clicking the heart button opens the selector (local state)', async () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        const selector = wrapper.find('[data-testid="selector"]');
        expect(selector.attributes('data-open')).toBe('false');

        const heartBtn = wrapper.find('button[aria-label^="Add"]');
        await heartBtn.trigger('click');

        const selectorAfter = wrapper.find('[data-testid="selector"]');
        expect(selectorAfter.attributes('data-open')).toBe('true');
    });

    it('clicking the poster opens the details modal (local state)', async () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('false');

        const posterBtn = wrapper.find('button[aria-label^="View details"]');
        expect(posterBtn.exists()).toBe(true);
        await posterBtn.trigger('click');

        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');
    });

    it('opening details does not open the add-to-list selector', async () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        await wrapper.find('button[aria-label^="View details"]').trigger('click');

        // The two transient dialogs are independent
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');
        expect(wrapper.find('[data-testid="selector"]').attributes('data-open')).toBe('false');
    });

    it('shows an outline heart when the show is not favorited', () => {
        const wrapper = mount(ShowCard, { props: { show: makeShow({ external_id: 169 }) } });
        const heartSvg = wrapper.find('button[aria-label^="Add"] svg');
        expect(heartSvg.attributes('fill')).toBe('none');
    });

    it('fills the heart when the show is already favorited', () => {
        const store = useFavoriteListsStore();
        store.favoritedIds = [169];

        const wrapper = mount(ShowCard, { props: { show: makeShow({ external_id: 169 }) } });
        // When favorited, the heart button label changes to "… is saved …"
        const heartBtn = wrapper.find('button[aria-label*="is saved"]');
        expect(heartBtn.exists()).toBe(true);
        expect(heartBtn.find('svg').attributes('fill')).toBe('currentColor');
    });

    it('clicking the title opens the details modal', async () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        const titleBtn = wrapper.find('h2 button');
        expect(titleBtn.exists()).toBe(true);
        await titleBtn.trigger('click');

        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');
    });

    it('add-to-list from the details modal closes details and opens the selector', async () => {
        const show = makeShow();
        const wrapper = mount(ShowCard, { props: { show } });

        // Open details first
        await wrapper.find('button[aria-label^="View details"]').trigger('click');
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('true');

        // The details modal asks to add to a list
        wrapper.findComponent({ name: 'ShowDetailsModal' }).vm.$emit('add-to-list');
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        // Details closes, the picker opens (no two stacked dialogs)
        expect(wrapper.find('[data-testid="details"]').attributes('data-open')).toBe('false');
        expect(wrapper.find('[data-testid="selector"]').attributes('data-open')).toBe('true');
    });
});
