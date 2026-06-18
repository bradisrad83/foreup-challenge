<template>
    <div
        class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        aria-hidden="true"
    >
        <!-- Poster skeleton -->
        <div class="aspect-[3/4] animate-pulse bg-gray-200"></div>

        <!-- Body skeleton -->
        <div class="flex flex-col gap-3 p-4">
            <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div class="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
            <div class="flex gap-1">
                <div class="h-5 w-12 animate-pulse rounded-full bg-gray-200"></div>
                <div class="h-5 w-16 animate-pulse rounded-full bg-gray-200"></div>
            </div>
            <div class="space-y-1.5">
                <div class="h-3 animate-pulse rounded bg-gray-200"></div>
                <div class="h-3 w-5/6 animate-pulse rounded bg-gray-200"></div>
                <div class="h-3 w-4/6 animate-pulse rounded bg-gray-200"></div>
            </div>
        </div>
    </div>
</template>
