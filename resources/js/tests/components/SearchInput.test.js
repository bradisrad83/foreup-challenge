import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import SearchInput from '../../components/shows/SearchInput.vue';

// Mock the api module (SearchInput → useShowsStore → getShows)
vi.mock('../../services/api.js', () => ({
    getShows: vi.fn(),
}));

import { getShows } from '../../services/api.js';

describe('SearchInput component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('renders the search input with accessible label', () => {
        const wrapper = mount(SearchInput);
        const input = wrapper.find('input#show-search');
        expect(input.exists()).toBe(true);

        // The label is sr-only but must exist and be associated with the input
        const label = wrapper.find('label[for="show-search"]');
        expect(label.exists()).toBe(true);
    });

    it('clear button is NOT rendered when the input is empty', () => {
        const wrapper = mount(SearchInput);
        // No text in input → button must be absent
        const clearBtn = wrapper.find('button[aria-label="Clear search"]');
        expect(clearBtn.exists()).toBe(false);
    });

    it('clear button IS rendered when the input has text', async () => {
        const wrapper = mount(SearchInput);
        const input = wrapper.find('input#show-search');
        await input.setValue('breaking');

        const clearBtn = wrapper.find('button[aria-label="Clear search"]');
        expect(clearBtn.exists()).toBe(true);
    });

    it('clicking clear resets the input to empty', async () => {
        getShows.mockResolvedValue({ data: [] });

        const wrapper = mount(SearchInput);
        const input = wrapper.find('input#show-search');
        await input.setValue('breaking');

        const clearBtn = wrapper.find('button[aria-label="Clear search"]');
        await clearBtn.trigger('click');

        expect(wrapper.find('input#show-search').element.value).toBe('');
    });

    it('clicking clear triggers a clearSearch (unfiltered fetch)', async () => {
        getShows.mockResolvedValue({ data: [] });

        const wrapper = mount(SearchInput);
        const input = wrapper.find('input#show-search');
        await input.setValue('breaking');

        const clearBtn = wrapper.find('button[aria-label="Clear search"]');
        await clearBtn.trigger('click');

        // clearSearch calls fetchShows('') which calls getShows with no params
        expect(getShows).toHaveBeenCalledWith(undefined, expect.any(AbortSignal));
    });

    it('clear button disappears after clearing', async () => {
        getShows.mockResolvedValue({ data: [] });

        const wrapper = mount(SearchInput);
        const input = wrapper.find('input#show-search');
        await input.setValue('hello');

        await wrapper.find('button[aria-label="Clear search"]').trigger('click');

        // After clearing, the clear button should be gone
        expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(false);
    });
});
