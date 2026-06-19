<script setup>
/**
 * RemoveFavoriteButton — removes one favorite from the currently selected list.
 * Uses the store's removeFromList action. Shows a brief loading state.
 */
import { ref } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';

const props = defineProps({
    favoriteId: {
        type: Number,
        required: true,
    },
});

const favoriteListsStore = useFavoriteListsStore();
const removing = ref(false);

async function remove() {
    removing.value = true;
    await favoriteListsStore.removeFromList(props.favoriteId);
    removing.value = false;
}
</script>

<template>
    <button
        type="button"
        :disabled="removing"
        :aria-label="removing ? 'Removing…' : 'Remove from list'"
        class="rounded p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
        @click="remove"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
</template>
