import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ShowDetailsModal from '../../components/shows/ShowDetailsModal.vue';

/**
 * ShowDetailsModal renders via AppDialog, which uses <Teleport to="body">.
 * So content lands in document.body; we mount with attachTo: document.body and
 * query via document.querySelector, cleaning the body after each test.
 */

function makeShow(overrides = {}) {
    return {
        external_id: 169,
        name: 'Breaking Bad',
        image_url: 'https://example.com/poster.jpg',
        summary: 'A high school chemistry teacher turns to making methamphetamine.',
        premiered: '2008-01-20',
        ended: '2013-09-29',
        status: 'Ended',
        genres: ['Drama', 'Crime', 'Thriller'],
        rating: 9.2,
        language: 'English',
        network: 'AMC',
        official_url: 'https://www.amc.com/shows/breaking-bad',
        metadata: { runtime: 60, show_type: 'Scripted' },
        ...overrides,
    };
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ShowDetailsModal', () => {
    it('renders nothing in the body when closed', () => {
        mount(ShowDetailsModal, {
            props: { open: false, show: makeShow() },
            attachTo: document.body,
        });
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('shows the full summary as plain text (no v-html)', () => {
        const show = makeShow({ summary: 'A <b>bold</b> & tricky summary.' });
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).not.toBeNull();
        // Raw markup rendered as text, not interpreted
        expect(dialog.textContent).toContain('<b>bold</b>');
        expect(dialog.querySelector('b')).toBeNull();
    });

    it('renders ALL genres (not truncated like the card)', () => {
        const show = makeShow({ genres: ['Drama', 'Crime', 'Thriller', 'Mystery', 'Action'] });
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        const text = document.querySelector('[role="dialog"]').textContent;
        for (const genre of show.genres) {
            expect(text).toContain(genre);
        }
    });

    it('shows a fallback when there is no summary', () => {
        const show = makeShow({ summary: null });
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        expect(document.querySelector('[role="dialog"]').textContent).toContain('No summary available.');
    });

    it('renders an official-site link for http(s) URLs', () => {
        const show = makeShow({ official_url: 'https://www.amc.com/shows/breaking-bad' });
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        const link = document.querySelector('[role="dialog"] a[href^="https://"]');
        expect(link).not.toBeNull();
        expect(link.getAttribute('href')).toBe('https://www.amc.com/shows/breaking-bad');
        expect(link.getAttribute('rel')).toContain('noopener');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('does NOT render a link for a non-http(s) official_url (javascript: guard)', () => {
        const show = makeShow({ official_url: 'javascript:alert(1)' });
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        const link = document.querySelector('[role="dialog"] a');
        expect(link).toBeNull();
    });

    it('renders the show name as the dialog title and the year range', () => {
        const show = makeShow();
        mount(ShowDetailsModal, { props: { open: true, show }, attachTo: document.body });

        const text = document.querySelector('[role="dialog"]').textContent;
        expect(text).toContain('Breaking Bad');
        expect(text).toContain('2008–2013');
    });

    it('emits add-to-list when the heart (add-to-list) button is clicked', () => {
        const wrapper = mount(ShowDetailsModal, {
            props: { open: true, show: makeShow() },
            attachTo: document.body,
        });

        const addBtn = document.querySelector('[role="dialog"] button[aria-label*="favorite list"]');
        expect(addBtn).not.toBeNull();
        addBtn.click();

        expect(wrapper.emitted('add-to-list')).toBeTruthy();
    });
});
