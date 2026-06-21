<script setup>
import { computed } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import SearchInput from '../shows/SearchInput.vue';

const props = defineProps({
    // Which view is active: false = Browse (grid), true = My Lists.
    listsActive: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['set-lists']);

const favoriteListsStore = useFavoriteListsStore();

// Total count of all lists — shown as a badge on the My Lists tab
const listCount = computed(() => favoriteListsStore.lists.length);

/**
 * ARIA tablist keyboard navigation: Left/Right arrows move between tabs.
 * This matches the WAI-ARIA tab pattern where arrow keys cycle through tabs.
 */
function onTablistKeydown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        // Toggle between the two tabs (Browse = false, My Lists = true)
        emit('set-lists', !props.listsActive);
    }
}
</script>

<template>
    <header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div class="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <!-- App title -->
                <div class="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-indigo-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                    <span class="text-base font-semibold text-gray-900">Showlist</span>
                </div>

                <!-- Right side: search + My Lists control -->
                <div class="flex items-center gap-3">
                    <!-- Search input -->
                    <div class="w-full sm:max-w-sm">
                        <SearchInput />
                    </div>

                    <!-- Browse / My Lists segmented control -->
                    <div
                        class="inline-flex shrink-0 rounded-lg border border-gray-300 bg-gray-100 p-0.5 text-sm font-medium"
                        role="tablist"
                        aria-label="Browse or My Lists"
                        @keydown="onTablistKeydown"
                    >
                        <button
                            type="button"
                            role="tab"
                            class="rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            :class="!listsActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                            :aria-selected="!listsActive"
                            @click="emit('set-lists', false)"
                        >
                            Browse
                        </button>
                        <button
                            type="button"
                            role="tab"
                            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            :class="listsActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                            :aria-selected="listsActive"
                            @click="emit('set-lists', true)"
                        >
                            My Lists
                            <span v-if="listCount > 0" class="rounded-full bg-indigo-100 px-1.5 text-xs font-semibold text-indigo-700">
                                {{ listCount }}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>
