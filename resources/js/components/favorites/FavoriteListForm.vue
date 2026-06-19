<script setup>
/**
 * FavoriteListForm — inline form for creating a new favorite list.
 *
 * Surfaces 422 errors.name inline for duplicate/invalid names.
 * Keeps all form state local (not in the store).
 */
import { ref } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';

const favoriteListsStore = useFavoriteListsStore();

const name = ref('');
const submitting = ref(false);
// Local field error — set from the store's 422 response
const fieldError = ref(null);

async function submit() {
    fieldError.value = null;

    const trimmed = name.value.trim();
    if (!trimmed) {
        fieldError.value = 'Please enter a list name.';
        return;
    }

    submitting.value = true;
    favoriteListsStore.clearCreateErrors();

    const success = await favoriteListsStore.createList(trimmed);

    submitting.value = false;

    if (success) {
        name.value = '';
    } else {
        // Surface the 422 field-level error if present, else the top-level message
        const fieldErrors = favoriteListsStore.createErrors;
        if (fieldErrors && fieldErrors.name && fieldErrors.name.length) {
            fieldError.value = fieldErrors.name[0];
        } else {
            fieldError.value = favoriteListsStore.createError || 'Could not create the list.';
        }
    }
}
</script>

<template>
    <form class="space-y-2" aria-label="Create a new favorite list" @submit.prevent="submit">
        <div>
            <label for="new-list-name" class="sr-only">New list name</label>
            <input
                id="new-list-name"
                v-model="name"
                type="text"
                placeholder="New list name…"
                maxlength="255"
                :disabled="submitting"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
                :aria-describedby="fieldError ? 'new-list-error' : undefined"
                :aria-invalid="fieldError ? 'true' : undefined"
            />
        </div>

        <!-- Inline validation error -->
        <p
            v-if="fieldError"
            id="new-list-error"
            role="alert"
            class="text-xs text-red-600"
        >
            {{ fieldError }}
        </p>

        <button
            type="submit"
            :disabled="submitting || !name.trim()"
            class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        >
            <span v-if="submitting">Creating…</span>
            <span v-else>Create list</span>
        </button>
    </form>
</template>
