import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import App from '../../App.vue';

/**
 * App-level regression test.
 *
 * Bug fixed in Phase 4: ShowGrid is a multi-root component (its template has
 * multiple root elements). Using v-show directly on a multi-root component
 * only hides the first root element, leaving the grid visible when My Lists
 * is active. The fix wraps ShowGrid in a single <div v-show="!showLists">.
 *
 * This test verifies that the grid wrapper is hidden when My Lists is active.
 */

// ---- Stubs for all child components that the App tree loads ----------------
// We stub deeply so the test remains fast and isolated: we only care about
// whether the ShowGrid wrapper div is hidden, not about the internals of any
// child.

vi.mock('../../services/api.js', () => ({
    getShows: vi.fn().mockResolvedValue({ data: [] }),
    getFavoriteLists: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../components/layout/AppHeader.vue', () => ({
    default: {
        name: 'AppHeader',
        props: ['listsActive'],
        emits: ['set-lists'],
        template: `
            <header>
                <button data-testid="browse-tab" @click="$emit('set-lists', false)">Browse</button>
                <button data-testid="lists-tab" @click="$emit('set-lists', true)">My Lists</button>
            </header>
        `,
    },
}));

vi.mock('../../components/layout/FavoritesPanel.vue', () => ({
    default: {
        name: 'FavoritesPanel',
        template: '<div data-testid="favorites-panel">Favorites Panel</div>',
    },
}));

vi.mock('../../components/shows/ShowGrid.vue', () => ({
    default: {
        name: 'ShowGrid',
        template: '<div data-testid="show-grid">Show Grid</div>',
    },
}));

describe('App — My Lists active hides the grid (v-show regression)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('shows the grid wrapper and hides FavoritesPanel when Browse is active', async () => {
        const wrapper = mount(App, { attachTo: document.body });

        // Default state is Browse (showLists = false)
        const gridWrapper = wrapper.find('div[style*="display: none"]');
        // Grid wrapper should NOT be hidden (i.e., no display:none)
        // We check by finding the wrapper that contains ShowGrid
        const showGridEl = wrapper.find('[data-testid="show-grid"]');
        expect(showGridEl.exists()).toBe(true);

        const favPanel = wrapper.find('[data-testid="favorites-panel"]');
        expect(favPanel.exists()).toBe(false);

        wrapper.unmount();
    });

    it('hides the grid wrapper when My Lists tab is activated', async () => {
        const wrapper = mount(App, { attachTo: document.body });

        // Click the My Lists tab
        const listsTab = wrapper.find('[data-testid="lists-tab"]');
        await listsTab.trigger('click');
        await wrapper.vm.$nextTick();

        // FavoritesPanel should now be visible
        const favPanel = wrapper.find('[data-testid="favorites-panel"]');
        expect(favPanel.exists()).toBe(true);

        // The ShowGrid wrapper div must be hidden via v-show (display: none)
        // Find the div that wraps ShowGrid — it is the v-show wrapper
        const showGridEl = wrapper.find('[data-testid="show-grid"]');
        expect(showGridEl.exists()).toBe(true); // still mounted (v-show, not v-if)
        const gridParent = showGridEl.element.parentElement;
        expect(gridParent.style.display).toBe('none');

        wrapper.unmount();
    });

    it('restores the grid wrapper when switching back to Browse', async () => {
        const wrapper = mount(App, { attachTo: document.body });

        // Go to My Lists
        await wrapper.find('[data-testid="lists-tab"]').trigger('click');
        await wrapper.vm.$nextTick();

        const gridParentHidden = wrapper.find('[data-testid="show-grid"]').element.parentElement;
        expect(gridParentHidden.style.display).toBe('none');

        // Come back to Browse
        await wrapper.find('[data-testid="browse-tab"]').trigger('click');
        await wrapper.vm.$nextTick();

        const gridParentVisible = wrapper.find('[data-testid="show-grid"]').element.parentElement;
        expect(gridParentVisible.style.display).not.toBe('none');

        wrapper.unmount();
    });
});
