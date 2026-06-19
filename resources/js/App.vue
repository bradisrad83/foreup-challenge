<script setup>
import { onMounted } from 'vue';
import { useShowsStore } from './stores/shows.js';
import AppHeader from './components/layout/AppHeader.vue';
import ShowGrid from './components/shows/ShowGrid.vue';

const showsStore = useShowsStore();

// Trigger the initial unfiltered fetch on mount (no full-page reload)
onMounted(() => {
    showsStore.fetchShows();
});
</script>

<template>
    <div class="min-h-screen bg-gray-50">
        <AppHeader />

        <main class="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
            <ShowGrid />
        </main>
    </div>
</template>
