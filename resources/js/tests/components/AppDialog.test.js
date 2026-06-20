import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AppDialog from '../../components/shared/AppDialog.vue';

/**
 * AppDialog uses Teleport (to="body"). The dialog panel is rendered directly
 * into document.body, so we:
 * - pass attachTo: document.body so Vue mounts within the document
 * - query the dialog via document.querySelector (not wrapper.find)
 * - for emitted events, we spy on the close callback via onVnodeUpdated or
 *   use a wrapper component so we can track the emit through a parent handler.
 */

function mountDialog(props = {}, slots = {}) {
    return mount(AppDialog, {
        props: {
            open: true,
            title: 'My Dialog',
            ...props,
        },
        slots,
        attachTo: document.body,
    });
}

describe('AppDialog component', () => {
    afterEach(() => {
        // Clean up any orphaned DOM from Teleport
        document.body.innerHTML = '';
    });

    it('does not render dialog content when closed', () => {
        const wrapper = mount(AppDialog, {
            props: { open: false, title: 'My Dialog' },
            attachTo: document.body,
        });
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        wrapper.unmount();
    });

    it('renders dialog with role="dialog" and aria-modal="true" when open', () => {
        const wrapper = mountDialog();

        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).not.toBeNull();
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        wrapper.unmount();
    });

    it('renders the title inside the dialog', () => {
        const wrapper = mountDialog({ title: 'Test Title' });

        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog.textContent).toContain('Test Title');
        wrapper.unmount();
    });

    it('renders slot content inside the dialog', () => {
        const wrapper = mountDialog({}, { default: '<p data-testid="slot-content">Hello slot</p>' });

        // Teleport content is in document.body; query the whole document
        const slotEl = document.querySelector('[data-testid="slot-content"]');
        expect(slotEl).not.toBeNull();
        expect(slotEl.textContent).toBe('Hello slot');
        wrapper.unmount();
    });

    it('emits close when the backdrop is clicked', async () => {
        // Mount with open: false, then transition to open: true to trigger the
        // watcher that attaches the event listener and renders the dialog.
        const parent = mount({
            template: `<AppDialog :open="open" title="Test" @close="onClose" />`,
            components: { AppDialog },
            methods: {
                onClose() { this.closed = true; },
            },
            data() { return { open: false, closed: false }; },
        }, { attachTo: document.body });

        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick(); // extra tick for focus logic inside the watcher

        const backdrop = document.querySelector('[aria-hidden="true"]');
        expect(backdrop).not.toBeNull();
        backdrop.click();
        await parent.vm.$nextTick();

        expect(parent.vm.closed).toBe(true);
        parent.unmount();
    });

    it('emits close when Escape key is pressed while dialog is open', async () => {
        // Mount closed, then open so the watcher registers the keydown listener.
        const parent = mount({
            template: `<AppDialog :open="open" title="Test" @close="onClose" />`,
            components: { AppDialog },
            methods: {
                onClose() { this.closed = true; },
            },
            data() { return { open: false, closed: false }; },
        }, { attachTo: document.body });

        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(event);
        await parent.vm.$nextTick();

        expect(parent.vm.closed).toBe(true);
        parent.unmount();
    });

    it('does NOT emit close on non-Escape keys', async () => {
        const parent = mount({
            template: `<AppDialog :open="open" title="Test" @close="onClose" />`,
            components: { AppDialog },
            methods: {
                onClose() { this.closed = true; },
            },
            data() { return { open: false, closed: false }; },
        }, { attachTo: document.body });

        parent.vm.open = true;
        await parent.vm.$nextTick();
        await parent.vm.$nextTick();

        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        document.dispatchEvent(event);
        await parent.vm.$nextTick();

        expect(parent.vm.closed).toBe(false);
        parent.unmount();
    });

    it('removes the keydown listener after unmount (no listener leakage)', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener');

        const wrapper = mountDialog();
        wrapper.unmount();

        const removedKeydown = removeSpy.mock.calls.some(([type]) => type === 'keydown');
        expect(removedKeydown).toBe(true);

        removeSpy.mockRestore();
    });
});
