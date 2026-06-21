<script setup>
/**
 * AppDialog — an accessible modal dialog wrapper.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby pointing at the title slot
 * - Escape key closes the dialog
 * - Focus is trapped inside while open
 * - Initial focus lands on the first meaningful content element (input, primary
 *   action) inside the slot, falling back to the dialog panel itself — NOT the
 *   close button (which would be useless as a landing target)
 * - Backdrop click closes the dialog
 * - Body scroll is locked while the dialog is open
 * - Focus is restored to the trigger element on close
 *
 * Usage:
 *   <AppDialog :open="isOpen" title="My Dialog" @close="isOpen = false">
 *     <p>Dialog content here</p>
 *   </AppDialog>
 */
import { ref, watch, nextTick, onUnmounted } from 'vue';

const props = defineProps({
    open: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['close']);

const dialogRef = ref(null);
const titleId = `dialog-title-${Math.random().toString(36).slice(2)}`;

function close() {
    emit('close');
}

/** Return all focusable (non-disabled) elements inside the dialog. */
function getFocusable() {
    if (!dialogRef.value) return [];
    return Array.from(
        dialogRef.value.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((el) => !el.disabled);
}

function onKeydown(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
        close();
    }

    // Focus trap: prevent Tab from leaving the dialog
    if (event.key === 'Tab' && dialogRef.value) {
        const focusable = getFocusable();
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }
}

/** Lock body scroll while the dialog is open. */
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
}

/** Restore body scroll (called on close and unmount). */
function unlockBodyScroll() {
    document.body.style.overflow = '';
}

// Keep track of the element that triggered the dialog so we can restore focus
let previousFocus = null;

watch(
    () => props.open,
    async (isOpen) => {
        if (isOpen) {
            previousFocus = document.activeElement;
            lockBodyScroll();
            document.addEventListener('keydown', onKeydown);

            await nextTick();

            if (dialogRef.value) {
                // Focus the first meaningful content element — look inside the
                // slot content area first (skipping the close button in the header).
                // The dialog panel itself carries tabindex="-1" as a fallback.
                const contentArea = dialogRef.value.querySelector('.dialog-content');
                const contentFocusable = contentArea
                    ? Array.from(
                          contentArea.querySelectorAll(
                              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                          ),
                      ).filter((el) => !el.disabled)
                    : [];

                if (contentFocusable.length > 0) {
                    contentFocusable[0].focus();
                } else {
                    // Fall back to the dialog panel itself (tabindex="-1")
                    dialogRef.value.focus();
                }
            }
        } else {
            document.removeEventListener('keydown', onKeydown);
            unlockBodyScroll();
            // Restore focus to the element that opened the dialog
            if (previousFocus && typeof previousFocus.focus === 'function') {
                previousFocus.focus();
            }
            previousFocus = null;
        }
    },
);

onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown);
    unlockBodyScroll();
});
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-opacity duration-200"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="open"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="presentation"
            >
                <!-- Backdrop -->
                <div
                    class="absolute inset-0 bg-black/40"
                    aria-hidden="true"
                    @click="close"
                />

                <!-- Dialog panel. tabindex="-1" lets it receive programmatic focus
                     as a fallback when the slot content has no focusable elements. -->
                <div
                    ref="dialogRef"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="titleId"
                    tabindex="-1"
                    class="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl focus:outline-none"
                >
                    <!-- Header -->
                    <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <h2 :id="titleId" class="text-base font-semibold text-gray-900">
                            {{ title }}
                        </h2>
                        <button
                            type="button"
                            class="rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            aria-label="Close dialog"
                            @click="close"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <!-- Content slot. The `dialog-content` class is used by the
                         focus logic above to locate the first meaningful target
                         and skip the close button in the header. -->
                    <div class="dialog-content px-5 py-4">
                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
