<script setup>
import { computed } from 'vue';
import { useShowsStore } from '../../stores/shows.js';
import ShowCard from './ShowCard.vue';
import ShowCardSkeleton from './ShowCardSkeleton.vue';
import EmptyState from '../shared/EmptyState.vue';
import ErrorAlert from '../shared/ErrorAlert.vue';

const showsStore = useShowsStore();

// Shared responsive grid layout for both the skeleton and results grids.
const GRID_CLASS =
    'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

// Number of skeleton cards shown during initial/subsequent loads
const SKELETON_COUNT = 12;
const skeletons = computed(() => Array.from({ length: SKELETON_COUNT }));

const emptyMessage = computed(() =>
    showsStore.query
        ? `No shows found for "${showsStore.query}".`
        : 'No shows available at the moment.',
);
</script>

<template>
    <!-- Accessible live region: announces loading, empty, and error states to screen readers -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
        <span v-if="showsStore.loading">Loading shows…</span>
        <span v-else-if="showsStore.error">Error: {{ showsStore.error }}</span>
        <span v-else-if="!showsStore.results.length">{{ emptyMessage }}</span>
        <span v-else>{{ showsStore.results.length }} show{{ showsStore.results.length === 1 ? '' : 's' }} found.</span>
    </div>

    <!-- Exclusive state chain: error → loading → empty → results -->
    <!-- Error state -->
    <ErrorAlert
        v-if="showsStore.error"
        :message="showsStore.error"
        class="mb-6"
    />

    <!-- Loading skeleton grid -->
    <div
        v-else-if="showsStore.loading"
        :class="GRID_CLASS"
        aria-label="Loading shows"
    >
        <ShowCardSkeleton
            v-for="(_, i) in skeletons"
            :key="i"
        />
    </div>

    <!-- Empty state (not loading, no results) -->
    <EmptyState
        v-else-if="!showsStore.results.length"
        :message="emptyMessage"
    />

    <!-- Results grid -->
    <div
        v-else
        :class="GRID_CLASS"
        aria-label="TV shows"
    >
        <ShowCard
            v-for="show in showsStore.results"
            :key="show.external_id"
            :show="show"
        />
    </div>
</template>
