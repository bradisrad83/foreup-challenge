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
 * - Remove favorite (the remove action lives on each FavoriteCard)
 * - Delete list with confirmation (ConfirmDialog)
 * - Back navigation (deselect)
 */
import { ref, computed } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import FavoriteCard from './FavoriteCard.vue';
import ConfirmDialog from '../shared/ConfirmDialog.vue';
import ErrorAlert from '../shared/ErrorAlert.vue';

const favoriteListsStore = useFavoriteListsStore();

const showDeleteConfirm = ref(false);
const deleteLoading = ref(false);

const list = computed(() => favoriteListsStore.selectedList);
const loading = computed(() => favoriteListsStore.selectedListLoading);
const error = computed(() => favoriteListsStore.selectedListError);

// Shared responsive grid layout (matches the Browse grid).
const GRID_CLASS =
    'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

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

        <!-- Loading skeleton (grid of poster placeholders) -->
        <div v-if="loading" :class="GRID_CLASS" aria-label="Loading favorites">
            <div
                v-for="i in 6"
                :key="i"
                class="overflow-hidden rounded-lg border border-gray-200"
            >
                <div class="aspect-[3/4] animate-pulse bg-gray-200"></div>
                <div class="space-y-2 p-4">
                    <div class="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
                    <div class="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
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

        <!-- Favorites grid (updated_at desc order as returned by API) -->
        <div
            v-else-if="list && list.favorites && list.favorites.length"
            :class="GRID_CLASS"
            aria-label="Favorites in this list"
        >
            <FavoriteCard
                v-for="favorite in list.favorites"
                :key="favorite.id"
                :favorite="favorite"
            />
        </div>

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
