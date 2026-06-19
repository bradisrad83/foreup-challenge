<script setup>
import { ref } from 'vue';

const mounted = ref(true);
</script>

<template>
    <div class="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <h1 class="text-2xl font-semibold">Vue is mounted 🎉</h1>
        <p v-if="mounted" class="text-sm text-gray-500">
            Laravel 13 + Vue 3 (Composition API) scaffold is working.
        </p>
    </div>
</template>
