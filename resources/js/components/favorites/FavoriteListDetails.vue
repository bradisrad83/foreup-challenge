<script setup>
/**
 * FavoriteListDetails — shows the favorites in the currently selected list.
 *
 * Favorites are returned by the API in updated_at desc order (most recently
 * modified first) and displayed as-is.
 *
 * Handles:
 * - Loading skeleton
 * - Error state
 * - Empty state
 * - Remove favorite (via RemoveFavoriteButton)
 * - Delete list with confirmation (ConfirmDialog)
 * - Back navigation (deselect)
 */
import { ref, computed } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import RemoveFavoriteButton from './RemoveFavoriteButton.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import ErrorAlert from '../shared/ErrorAlert.vue';

const favoriteListsStore = useFavoriteListsStore();

const showDeleteConfirm = ref(false);
const deleteLoading = ref(false);

const list = computed(() => favoriteListsStore.selectedList);
const loading = computed(() => favoriteListsStore.selectedListLoading);
const error = computed(() => favoriteListsStore.selectedListError);

const PLACEHOLDER =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="85" viewBox="0 0 60 85"%3E%3Crect width="60" height="85" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="8" fill="%239ca3af"%3ENo img%3C/text%3E%3C/svg%3E';

function onImageError(event) {
    event.target.src = PLACEHOLDER;
}

async function confirmDelete() {
    deleteLoading.value = true;
    const id = favoriteListsStore.selectedListId;
    await favoriteListsStore.deleteList(id);
    deleteLoading.value = false;
    showDeleteConfirm.value = false;
    // selectedList is cleared by the store on delete
}
</script>

<template>
    <div>
        <!-- Back + title row -->
        <div class="mb-4 flex items-center gap-2">
            <button
                type="button"
                class="rounded p-1 text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Back to all lists"
                @click="favoriteListsStore.deselectList()"
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
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </button>

            <h3 class="flex-1 truncate text-sm font-semibold text-gray-900">
                <template v-if="list">{{ list.name }}</template>
                <template v-else-if="loading">Loading…</template>
            </h3>

            <button
                v-if="list"
                type="button"
                class="rounded p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
                aria-label="Delete this list"
                @click="showDeleteConfirm = true"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
            </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" aria-label="Loading favorites" class="space-y-3">
            <div
                v-for="i in 3"
                :key="i"
                class="flex animate-pulse gap-3 rounded-lg border border-gray-100 p-3"
            >
                <div class="h-[68px] w-12 shrink-0 rounded bg-gray-200"></div>
                <div class="flex-1 space-y-2 py-1">
                    <div class="h-3 w-3/4 rounded bg-gray-200"></div>
                    <div class="h-3 w-1/2 rounded bg-gray-200"></div>
                </div>
            </div>
        </div>

        <!-- Error state -->
        <ErrorAlert v-else-if="error" :message="error" />

        <!-- Empty state -->
        <div
            v-else-if="list && (!list.favorites || list.favorites.length === 0)"
            class="flex flex-col items-center py-10 text-center text-sm text-gray-400"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mb-2 h-8 w-8 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
            </svg>
            <p>No shows in this list yet.</p>
            <p class="mt-1 text-xs text-gray-400">Add shows using the heart button on any show card.</p>
        </div>

        <!-- Favorites list (updated_at desc order as returned by API) -->
        <ul
            v-else-if="list && list.favorites && list.favorites.length"
            role="list"
            aria-label="Favorites in this list"
            class="space-y-2"
        >
            <li
                v-for="favorite in list.favorites"
                :key="favorite.id"
                class="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
            >
                <!-- Thumbnail -->
                <div class="h-[68px] w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                    <img
                        :src="favorite.image_url || PLACEHOLDER"
                        :alt="favorite.name ? `Poster for ${favorite.name}` : 'Show poster'"
                        loading="lazy"
                        class="h-full w-full object-cover"
                        @error="onImageError"
                    />
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">
                        {{ favorite.name }}
                    </p>
                    <div class="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                        <span v-if="favorite.network">{{ favorite.network }}</span>
                        <span v-if="favorite.premiered">{{ favorite.premiered.slice(0, 4) }}</span>
                        <span v-if="favorite.rating != null" class="font-medium text-amber-600">
                            &#9733; {{ Number(favorite.rating).toFixed(1) }}
                        </span>
                    </div>
                    <div v-if="favorite.genres && favorite.genres.length" class="mt-1 flex flex-wrap gap-1">
                        <span
                            v-for="genre in favorite.genres.slice(0, 2)"
                            :key="genre"
                            class="rounded-full bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700"
                        >
                            {{ genre }}
                        </span>
                    </div>
                </div>

                <!-- Remove button -->
                <RemoveFavoriteButton :favorite-id="favorite.id" class="mt-0.5 shrink-0" />
            </li>
        </ul>

        <!-- Counts footer -->
        <p v-if="list" class="mt-3 text-right text-xs text-gray-400">
            {{ list.favorites_count ?? (list.favorites ? list.favorites.length : 0) }}
            {{ (list.favorites_count ?? (list.favorites ? list.favorites.length : 0)) === 1 ? 'show' : 'shows' }}
        </p>

        <!-- Accessible live region for async state and content updates -->
        <div aria-live="polite" aria-atomic="true" class="sr-only">
            <span v-if="loading">Loading list details…</span>
            <span v-else-if="error">Error: {{ error }}</span>
            <span v-else-if="list && (!list.favorites || list.favorites.length === 0)">
                No shows in this list yet.
            </span>
            <span v-else-if="list && list.favorites && list.favorites.length">
                {{ list.favorites.length }} show{{ list.favorites.length === 1 ? '' : 's' }} in this list.
            </span>
        </div>

        <!-- Delete confirmation dialog -->
        <ConfirmDialog
            :open="showDeleteConfirm"
            title="Delete list?"
            :message="list ? `Delete '${list.name}' and all its saved shows? This cannot be undone.` : 'Delete this list and all its saved shows?'"
            confirm-label="Delete list"
            :loading="deleteLoading"
            @confirm="confirmDelete"
            @cancel="showDeleteConfirm = false"
            @close="showDeleteConfirm = false"
        />
    </div>
</template>
