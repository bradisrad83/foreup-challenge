<script setup>
/**
 * ShowDetailsModal — a read-only detail view for a single show, shown in a modal
 * (DECISIONS #24). Reuses AppDialog. All data comes from the show object the
 * card already holds — no extra API call. Summary is rendered as PLAIN TEXT
 * (never v-html). A modal (not a route) keeps "no Vue Router" (#12) intact.
 */
import { computed } from 'vue';
import AppDialog from '../shared/AppDialog.vue';

const props = defineProps({
    open: { type: Boolean, required: true },
    show: { type: Object, default: null },
});

const emit = defineEmits(['close', 'add-to-list']);

const PLACEHOLDER =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="210" height="295" viewBox="0 0 210 295"%3E%3Crect width="210" height="295" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3ENo image%3C/text%3E%3C/svg%3E';

function onImageError(event) {
    event.target.src = PLACEHOLDER;
}

// Only expose http(s) official URLs — defensive against javascript:/data: URIs.
const officialUrl = computed(() => {
    const url = props.show?.official_url;
    return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
});

const years = computed(() => {
    if (!props.show) return '';
    const start = props.show.premiered ? props.show.premiered.slice(0, 4) : null;
    const end = props.show.ended ? props.show.ended.slice(0, 4) : null;
    if (start && end) return start === end ? start : `${start}–${end}`;
    if (start) return `${start}–present`;
    return '';
});

const runtime = computed(() => props.show?.metadata?.runtime ?? null);
const showType = computed(() => props.show?.metadata?.show_type ?? null);
</script>

<template>
    <AppDialog
        :open="open"
        :title="show && show.name ? show.name : 'Show details'"
        @close="emit('close')"
    >
        <div v-if="show" class="flex flex-col gap-4 sm:flex-row">
            <!-- Poster with the same add-to-list heart as the card -->
            <div class="relative mx-auto h-48 w-32 shrink-0 sm:mx-0">
                <img
                    :src="show.image_url || PLACEHOLDER"
                    :alt="show.name ? `Poster for ${show.name}` : 'Show poster'"
                    class="h-full w-full rounded-lg object-cover shadow-sm"
                    @error="onImageError"
                />
                <button
                    type="button"
                    class="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/90 p-1.5 text-gray-500 shadow-sm hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    :aria-label="show.name ? `Add ${show.name} to a favorite list` : 'Add to a favorite list'"
                    @click="emit('add-to-list')"
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

            <div class="min-w-0 flex-1">
                <!-- Meta row -->
                <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    <span
                        v-if="show.status"
                        class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                        {{ show.status }}
                    </span>
                    <span v-if="years">{{ years }}</span>
                    <span v-if="show.network">{{ show.network }}</span>
                    <span v-if="show.language">{{ show.language }}</span>
                    <span v-if="show.rating != null" class="font-medium text-amber-600">
                        &#9733; {{ Number(show.rating).toFixed(1) }}
                    </span>
                </div>

                <!-- Genres (all of them) -->
                <div v-if="show.genres && show.genres.length" class="mb-3 flex flex-wrap gap-1">
                    <span
                        v-for="genre in show.genres"
                        :key="genre"
                        class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                    >
                        {{ genre }}
                    </span>
                </div>

                <!-- Full summary — plain text, never v-html -->
                <p v-if="show.summary" class="text-sm leading-relaxed text-gray-700">
                    {{ show.summary }}
                </p>
                <p v-else class="text-sm italic text-gray-400">No summary available.</p>

                <!-- Extra metadata -->
                <dl
                    v-if="runtime || showType"
                    class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500"
                >
                    <div v-if="runtime">
                        <dt class="inline font-medium">Runtime:</dt>
                        <dd class="inline"> {{ runtime }} min</dd>
                    </div>
                    <div v-if="showType">
                        <dt class="inline font-medium">Type:</dt>
                        <dd class="inline"> {{ showType }}</dd>
                    </div>
                </dl>

                <!-- Official site link (http(s) only) -->
                <a
                    v-if="officialUrl"
                    :href="officialUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-3 inline-flex items-center gap-1 rounded text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    Official site
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                    </svg>
                </a>
            </div>
        </div>
    </AppDialog>
</template>
