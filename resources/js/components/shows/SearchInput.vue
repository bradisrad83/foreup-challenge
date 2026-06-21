<script setup>
import { ref, watch } from 'vue';
import { useShowsStore } from '../../stores/shows.js';
import { useDebounce } from '../../composables/useDebounce.js';

const showsStore = useShowsStore();

// Local ref for the raw input value (updates on every keystroke)
const inputValue = ref(showsStore.query);

// Debounced version — triggers the search after ~300 ms of inactivity
const debouncedValue = useDebounce(inputValue, 300);

// Watch the debounced value and fire the search. Skip when the value already
// matches the store's current query — this avoids a duplicate request when
// clearSearch() has already fetched the unfiltered list synchronously.
watch(debouncedValue, (value) => {
    if (value === showsStore.query) {
        return;
    }
    showsStore.fetchShows(value);
});

function clearSearch() {
    inputValue.value = '';
    showsStore.clearSearch();
}
</script>

<template>
    <div class="relative flex items-center">
        <!-- Search icon -->
        <span class="pointer-events-none absolute left-3 text-gray-400" aria-hidden="true">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
                />
            </svg>
        </span>

        <label for="show-search" class="sr-only">Search TV shows</label>
        <input
            id="show-search"
            v-model="inputValue"
            type="search"
            autocomplete="off"
            placeholder="Search TV shows…"
            class="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        <!-- Clear button — visible only when there is input -->
        <button
            v-if="inputValue"
            type="button"
            class="absolute right-3 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-label="Clear search"
            @click="clearSearch"
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
</template>

<style scoped>
/*
 * Hide the browser's native "clear" control for type="search" (WebKit/Chrome)
 * so it doesn't duplicate our own Clear button. type="search" is kept for its
 * semantics (search keyboard on mobile, screen-reader announcement).
 */
input[type='search']::-webkit-search-cancel-button,
input[type='search']::-webkit-search-decoration {
    -webkit-appearance: none;
    appearance: none;
}
</style>
