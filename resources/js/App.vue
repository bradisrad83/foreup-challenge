<script setup>
import { ref, onMounted } from 'vue';
import { useShowsStore } from './stores/shows.js';
import { useFavoriteListsStore } from './stores/favoriteLists.js';
import AppHeader from './components/layout/AppHeader.vue';
import FavoritesPanel from './components/layout/FavoritesPanel.vue';
import ShowGrid from './components/shows/ShowGrid.vue';

const showsStore = useShowsStore();
const favoriteListsStore = useFavoriteListsStore();

// Browse vs. My Lists is state-driven on one screen (DECISIONS #23, #12 no
// Vue Router). false = Browse (the show grid), true = My Lists.
const showLists = ref(false);

onMounted(() => {
    showsStore.fetchShows();
    favoriteListsStore.fetchLists();
    favoriteListsStore.fetchFavoritedIds();
});
</script>

<template>
    <div class="min-h-screen bg-gray-50">
        <AppHeader
            :lists-active="showLists"
            @set-lists="showLists = $event"
        />

        <div class="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
            <!-- My Lists view (full width) — replaces the grid -->
            <FavoritesPanel v-if="showLists" />

            <!--
                Browse grid (full width). Wrapped in a single element so v-show
                can hide the whole grid (ShowGrid is a multi-root component);
                kept mounted so the search query, results, and scroll position
                survive a trip to My Lists and back.
            -->
            <div v-show="!showLists">
                <ShowGrid />
            </div>
        </div>
    </div>
</template>
