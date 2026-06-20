import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import FavoriteListForm from '../../components/favorites/FavoriteListForm.vue';

vi.mock('../../services/api.js', () => ({
    getFavoriteLists: vi.fn(),
    createFavoriteList: vi.fn(),
}));

import { createFavoriteList } from '../../services/api.js';

describe('FavoriteListForm component', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('renders the form with a text input and submit button', () => {
        const wrapper = mount(FavoriteListForm);
        expect(wrapper.find('input#new-list-name').exists()).toBe(true);
        expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    });

    it('shows a local validation error and does NOT call API when submitted empty', async () => {
        const wrapper = mount(FavoriteListForm);
        await wrapper.find('form').trigger('submit');

        expect(createFavoriteList).not.toHaveBeenCalled();
        // An inline error message should appear
        const error = wrapper.find('[role="alert"]');
        expect(error.exists()).toBe(true);
        expect(error.text()).toBeTruthy();
    });

    it('shows local error for whitespace-only input', async () => {
        const wrapper = mount(FavoriteListForm);
        await wrapper.find('input#new-list-name').setValue('   ');
        await wrapper.find('form').trigger('submit');

        expect(createFavoriteList).not.toHaveBeenCalled();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });

    it('calls createList and clears input on successful submit', async () => {
        const created = {
            id: 1, name: 'Drama Picks', favorites_count: 0,
            created_at: '2026-06-19T00:00:00Z', updated_at: '2026-06-19T00:00:00Z',
        };
        createFavoriteList.mockResolvedValueOnce({ data: created });

        const wrapper = mount(FavoriteListForm);
        await wrapper.find('input#new-list-name').setValue('Drama Picks');
        await wrapper.find('form').trigger('submit');

        // Wait for the async submission to complete
        await vi.waitUntil(() => !wrapper.vm.submitting);

        expect(createFavoriteList).toHaveBeenCalledWith({ name: 'Drama Picks' });
        expect(wrapper.find('input#new-list-name').element.value).toBe('');
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    });

    it('shows the errors.name[0] message on a 422 duplicate name response', async () => {
        const err = Object.assign(new Error('A list with this name already exists.'), {
            status: 422,
            errors: { name: ['A list with this name already exists.'] },
        });
        createFavoriteList.mockRejectedValueOnce(err);

        const wrapper = mount(FavoriteListForm);
        await wrapper.find('input#new-list-name').setValue('Drama Picks');
        await wrapper.find('form').trigger('submit');

        await vi.waitUntil(() => !wrapper.vm.submitting);

        const alert = wrapper.find('[role="alert"]');
        expect(alert.exists()).toBe(true);
        expect(alert.text()).toContain('A list with this name already exists.');
    });

    it('submit button is disabled when input is empty', () => {
        const wrapper = mount(FavoriteListForm);
        const btn = wrapper.find('button[type="submit"]');
        expect(btn.attributes('disabled')).toBeDefined();
    });

    it('submit button is enabled when input has text', async () => {
        const wrapper = mount(FavoriteListForm);
        await wrapper.find('input#new-list-name').setValue('My List');
        const btn = wrapper.find('button[type="submit"]');
        expect(btn.attributes('disabled')).toBeUndefined();
    });
});
