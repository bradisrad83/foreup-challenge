<script setup>
defineProps({
    message: {
        type: String,
        default: 'No shows found.',
    },
});
</script>

<template>
    <div class="flex flex-col items-center justify-center py-20 text-center text-gray-500">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mb-4 h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
        <p class="text-sm">{{ message }}</p>
    </div>
</template>
