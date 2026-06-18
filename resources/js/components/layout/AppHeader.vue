<script setup>
import SearchInput from '../shows/SearchInput.vue';
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
                    <span class="text-base font-semibold text-gray-900">TV Shows</span>
                </div>

                <!-- Search input -->
                <div class="w-full sm:max-w-sm">
                    <SearchInput />
                </div>
            </div>
        </div>
    </header>
</template>
