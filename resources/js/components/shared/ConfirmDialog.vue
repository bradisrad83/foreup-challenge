<script setup>
/**
 * ConfirmDialog — a slim dialog for destructive-action confirmation.
 *
 * Emits 'confirm' when the user confirms, 'cancel'/'close' when they don't.
 */
import AppDialog from './AppDialog.vue';

defineProps({
    open: {
        type: Boolean,
        required: true,
    },
    title: {
        type: String,
        default: 'Are you sure?',
    },
    message: {
        type: String,
        default: 'This action cannot be undone.',
    },
    confirmLabel: {
        type: String,
        default: 'Delete',
    },
    loading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['confirm', 'cancel', 'close']);
</script>

<template>
    <AppDialog :open="open" :title="title" @close="emit('close')">
        <p class="mb-5 text-sm text-gray-600">{{ message }}</p>
        <div class="flex justify-end gap-3">
            <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                :disabled="loading"
                @click="emit('cancel')"
            >
                Cancel
            </button>
            <button
                type="button"
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
                :disabled="loading"
                @click="emit('confirm')"
            >
                <span v-if="loading">Deleting…</span>
                <span v-else>{{ confirmLabel }}</span>
            </button>
        </div>
    </AppDialog>
</template>
