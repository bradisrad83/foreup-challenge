<script setup>
/**
 * FavoritesPanel — full-width favorites UI used by both the "panel" and "tabs"
 * layouts. Shows the lists as selectable pills + a create form, or the selected
 * list's detail (which is self-contained: it has its own back + delete).
 */
import { computed } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import FavoriteListForm from '../favorites/FavoriteListForm.vue';
import FavoriteListDetails from '../favorites/FavoriteListDetails.vue';
import ErrorAlert from '../shared/ErrorAlert.vue';

const store = useFavoriteListsStore();
const isDetail = computed(() => store.selectedListId !== null);
</script>

<template>
    <section aria-label="Favorite lists">
        <!-- Detail view (self-contained: own back + delete controls) -->
        <div v-if="isDetail">
            <FavoriteListDetails />
        </div>

        <!-- Index view: pills + create -->
        <div v-else>
            <ErrorAlert v-if="store.listsError" :message="store.listsError" class="mb-3" />

            <!-- Loading -->
            <div v-if="store.listsLoading" class="flex flex-wrap gap-2" aria-label="Loading lists">
                <div v-for="i in 4" :key="i" class="h-9 w-28 animate-pulse rounded-full bg-gray-100" />
            </div>

            <template v-else>
                <!-- List pills (alphabetical, with counts) -->
                <div class="mb-4 flex flex-wrap items-center gap-2">
                    <span v-if="!store.lists.length" class="text-sm text-gray-400">
                        No lists yet — create your first one to start saving shows.
                    </span>
                    <button
                        v-for="list in store.lists"
                        :key="list.id"
                        type="button"
                        class="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        @click="store.selectList(list.id)"
                    >
                        <span class="max-w-[12rem] truncate">{{ list.name }}</span>
                        <span class="rounded-full bg-indigo-100 px-1.5 text-xs font-semibold text-indigo-700">
                            {{ list.favorites_count }}
                        </span>
                    </button>
                </div>

                <!-- Create list -->
                <div class="max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">New list</p>
                    <FavoriteListForm />
                </div>
            </template>

            <!-- Accessible live region -->
            <div aria-live="polite" aria-atomic="true" class="sr-only">
                <span v-if="store.listsLoading">Loading your lists…</span>
                <span v-else-if="store.listsError">Error: {{ store.listsError }}</span>
                <span v-else-if="!store.lists.length">No favorite lists yet.</span>
                <span v-else>{{ store.lists.length }} list{{ store.lists.length === 1 ? '' : 's' }} available.</span>
            </div>
        </div>
    </section>
</template>
