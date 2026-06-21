<script setup>
/**
 * FavoriteCard — a saved show inside a list, rendered in the same grid-card
 * style as the Browse ShowCard so the two views match. Clicking the poster or
 * title opens the (read-only) details modal; the corner action is REMOVE from
 * the list (the add action lives on Browse cards).
 */
import { ref } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import ShowDetailsModal from '../shows/ShowDetailsModal.vue';

const props = defineProps({
    favorite: {
        type: Object,
        required: true,
    },
});

const favoriteListsStore = useFavoriteListsStore();

const PLACEHOLDER =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="210" height="295" viewBox="0 0 210 295"%3E%3Crect width="210" height="295" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3ENo image%3C/text%3E%3C/svg%3E';

// Transient UI state — local only
const detailsOpen = ref(false);
const removing = ref(false);

function onImageError(event) {
    event.target.src = PLACEHOLDER;
}

function truncate(text, maxLength = 160) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '…';
}

async function remove() {
    removing.value = true;
    await favoriteListsStore.removeFromList(props.favorite.id);
    removing.value = false;
    // Close the details modal too (harmless when it isn't open).
    detailsOpen.value = false;
}
</script>

<template>
    <article class="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        <!-- Poster — click to view full details -->
        <div class="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <button
                type="button"
                class="block h-full w-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400"
                :aria-label="favorite.name ? `View details for ${favorite.name}` : 'View show details'"
                @click="detailsOpen = true"
            >
                <img
                    :src="favorite.image_url || PLACEHOLDER"
                    :alt="favorite.name ? `Poster for ${favorite.name}` : 'Show poster'"
                    loading="lazy"
                    class="h-full w-full object-cover transition group-hover:scale-105"
                    @error="onImageError"
                />
            </button>

            <!-- Remove from this list (overlaid on poster) -->
            <button
                type="button"
                :disabled="removing"
                class="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-gray-500 shadow-sm hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                :aria-label="removing ? 'Removing…' : 'Remove from list'"
                @click.stop="remove"
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
        </div>

        <!-- Card body -->
        <div class="flex flex-1 flex-col gap-2 p-4">
            <h2 class="text-sm font-semibold leading-snug">
                <button
                    type="button"
                    class="line-clamp-2 rounded text-left text-gray-900 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    @click="detailsOpen = true"
                >
                    {{ favorite.name }}
                </button>
            </h2>

            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span v-if="favorite.network">{{ favorite.network }}</span>
                <span v-if="favorite.premiered">{{ favorite.premiered.slice(0, 4) }}</span>
                <span v-if="favorite.rating != null" class="font-medium text-amber-600">
                    &#9733; {{ Number(favorite.rating).toFixed(1) }}
                </span>
            </div>

            <div v-if="favorite.genres && favorite.genres.length" class="flex flex-wrap gap-1">
                <span
                    v-for="genre in favorite.genres.slice(0, 3)"
                    :key="genre"
                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                >
                    {{ genre }}
                </span>
            </div>

            <!-- Plain-text summary — never v-html -->
            <p v-if="favorite.summary" class="mt-auto line-clamp-4 text-xs leading-relaxed text-gray-600">
                {{ truncate(favorite.summary) }}
            </p>
        </div>

        <!-- Details modal: no add heart (already saved); offers a remove "✕". -->
        <ShowDetailsModal
            :open="detailsOpen"
            :show="favorite"
            :can-add="false"
            :can-remove="true"
            @close="detailsOpen = false"
            @remove="remove"
        />
    </article>
</template>
