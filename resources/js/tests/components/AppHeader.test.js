import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AppHeader from '../../components/layout/AppHeader.vue';

/**
 * AppHeader — Phase 6 accessibility tests.
 *
 * The segmented Browse / My Lists control uses role="tablist" with
 * role="tab" children. Per the WAI-ARIA tab pattern, Left and Right arrow
 * keys should cycle between tabs in addition to mouse/keyboard click.
 *
 * SearchInput is stubbed so this test remains isolated from the shows store.
 */

vi.mock('../../services/api.js', () => ({
    getShows: vi.fn().mockResolvedValue({ data: [] }),
    getFavoriteLists: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../../components/shows/SearchInput.vue', () => ({
    default: {
        name: 'SearchInput',
        template: '<input data-testid="search-input" type="search" />',
    },
}));

describe('AppHeader — tablist keyboard navigation (Phase 6)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    function mountHeader(listsActive = false) {
        return mount(AppHeader, {
            props: { listsActive },
            attachTo: document.body,
        });
    }

    it('emits set-lists with true when ArrowRight is pressed while Browse is active', async () => {
        const wrapper = mountHeader(false);

        const tablist = wrapper.find('[role="tablist"]');
        await tablist.trigger('keydown', { key: 'ArrowRight' });

        expect(wrapper.emitted('set-lists')).toBeTruthy();
        expect(wrapper.emitted('set-lists')[0]).toEqual([true]);

        wrapper.unmount();
    });

    it('emits set-lists with false when ArrowLeft is pressed while My Lists is active', async () => {
        const wrapper = mountHeader(true);

        const tablist = wrapper.find('[role="tablist"]');
        await tablist.trigger('keydown', { key: 'ArrowLeft' });

        expect(wrapper.emitted('set-lists')).toBeTruthy();
        expect(wrapper.emitted('set-lists')[0]).toEqual([false]);

        wrapper.unmount();
    });

    it('emits set-lists with true when ArrowLeft is pressed while Browse is active (wraps)', async () => {
        const wrapper = mountHeader(false);

        const tablist = wrapper.find('[role="tablist"]');
        await tablist.trigger('keydown', { key: 'ArrowLeft' });

        expect(wrapper.emitted('set-lists')).toBeTruthy();
        expect(wrapper.emitted('set-lists')[0]).toEqual([true]);

        wrapper.unmount();
    });

    it('does not emit set-lists for unrelated keys', async () => {
        const wrapper = mountHeader(false);

        const tablist = wrapper.find('[role="tablist"]');
        await tablist.trigger('keydown', { key: 'Enter' });

        expect(wrapper.emitted('set-lists')).toBeFalsy();

        wrapper.unmount();
    });

    it('renders Browse tab with aria-selected=true when Browse is active', () => {
        const wrapper = mountHeader(false);

        const tabs = wrapper.findAll('[role="tab"]');
        // First tab is Browse
        expect(tabs[0].attributes('aria-selected')).toBe('true');
        // Second tab is My Lists
        expect(tabs[1].attributes('aria-selected')).toBe('false');

        wrapper.unmount();
    });

    it('renders My Lists tab with aria-selected=true when My Lists is active', () => {
        const wrapper = mountHeader(true);

        const tabs = wrapper.findAll('[role="tab"]');
        expect(tabs[0].attributes('aria-selected')).toBe('false');
        expect(tabs[1].attributes('aria-selected')).toBe('true');

        wrapper.unmount();
    });
});
