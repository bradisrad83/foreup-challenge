<script setup>
import { ref } from 'vue';
import FavoriteListSelector from '../favorites/FavoriteListSelector.vue';

// Placeholder image shown when show.image_url is null or fails to load
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="210" height="295" viewBox="0 0 210 295"%3E%3Crect width="210" height="295" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3ENo image%3C/text%3E%3C/svg%3E';

const props = defineProps({
    show: {
        type: Object,
        required: true,
    },
});

// Transient UI state — local only, not in the store (ARCHITECTURE.md: state strategy)
const selectorOpen = ref(false);

function onImageError(event) {
    event.target.src = PLACEHOLDER;
}

// Safely truncate summary to a reasonable length for the card
function truncate(text, maxLength = 160) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '…';
}
</script>

<template>
    <article class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
        <!-- Show image -->
        <div class="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <img
                :src="show.image_url || PLACEHOLDER"
                :alt="show.name ? `Poster for ${show.name}` : 'Show poster'"
                loading="lazy"
                class="h-full w-full object-cover"
                @error="onImageError"
            />

            <!-- Add to list button (overlaid on poster) -->
            <button
                type="button"
                class="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-gray-500 shadow-sm hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                :aria-label="`Add ${show.name} to a favorite list`"
                @click.stop="selectorOpen = true"
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
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
            </button>
        </div>

        <!-- Card body -->
        <div class="flex flex-1 flex-col gap-2 p-4">
            <!-- Name -->
            <h2 class="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                {{ show.name }}
            </h2>

            <!-- Meta row: network, year, rating -->
            <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                <span v-if="show.network">{{ show.network }}</span>
                <span v-if="show.premiered">{{ show.premiered.slice(0, 4) }}</span>
                <span v-if="show.rating != null" class="font-medium text-amber-600">
                    &#9733; {{ show.rating.toFixed(1) }}
                </span>
            </div>

            <!-- Genres -->
            <div v-if="show.genres && show.genres.length" class="flex flex-wrap gap-1">
                <span
                    v-for="genre in show.genres.slice(0, 3)"
                    :key="genre"
                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                >
                    {{ genre }}
                </span>
            </div>

            <!-- Plain-text summary — never v-html -->
            <p v-if="show.summary" class="mt-auto line-clamp-4 text-xs leading-relaxed text-gray-600">
                {{ truncate(show.summary) }}
            </p>
        </div>

        <!-- Add-to-list dialog (transient UI state, local to this card) -->
        <FavoriteListSelector
            :open="selectorOpen"
            :show="show"
            @close="selectorOpen = false"
        />
    </article>
</template>
