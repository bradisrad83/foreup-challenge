<script setup>
/**
 * FavoriteListSelector — dialog for adding a show to one or more lists.
 *
 * Behavior:
 * - Shows all available lists as checkboxes
 * - Saving to multiple lists issues one POST per selected list (Promise.all via store)
 * - 409 duplicates are reported per list without aborting others
 * - Shows per-list outcome after saving
 * - Clears state when re-opened
 */
import { ref, computed, watch, nextTick } from 'vue';
import { useFavoriteListsStore } from '../../stores/favoriteLists.js';
import AppDialog from '../shared/AppDialog.vue';

const props = defineProps({
    open: {
        type: Boolean,
        required: true,
    },
    show: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(['close']);

const favoriteListsStore = useFavoriteListsStore();

// Local selection state — which list ids are checked
const selectedIds = ref([]);
const saving = ref(false);
// True once we've shown the per-list results
const submitted = ref(false);

// Inline "create a list" state (kept local to this component)
const creating = ref(false);
const newName = ref('');
const createSubmitting = ref(false);
const createError = ref(null);
const createInput = ref(null);

const lists = computed(() => favoriteListsStore.lists);
const addResults = computed(() => favoriteListsStore.addResults);

// Reset state whenever the dialog opens. If the user has no lists yet, open
// straight into the create form so they can make one without a dead end.
watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            selectedIds.value = [];
            saving.value = false;
            submitted.value = false;
            newName.value = '';
            createError.value = null;
            createSubmitting.value = false;
            favoriteListsStore.clearAddResults();

            if (lists.value.length === 0) {
                enableCreate();
            } else {
                creating.value = false;
            }
        }
    },
);

function toggleList(id) {
    if (selectedIds.value.includes(id)) {
        selectedIds.value = selectedIds.value.filter((i) => i !== id);
    } else {
        selectedIds.value = [...selectedIds.value, id];
    }
}

/** Show the inline create form and focus its input. */
function enableCreate() {
    creating.value = true;
    newName.value = '';
    createError.value = null;
    favoriteListsStore.clearCreateErrors();
    nextTick(() => createInput.value?.focus());
}

function cancelCreate() {
    creating.value = false;
    newName.value = '';
    createError.value = null;
}

/** Create a new list inline, then auto-select it for adding. */
async function submitCreate() {
    const trimmed = newName.value.trim();
    if (!trimmed) {
        createError.value = 'Please enter a list name.';
        return;
    }

    createSubmitting.value = true;
    favoriteListsStore.clearCreateErrors();
    const created = await favoriteListsStore.createList(trimmed);
    createSubmitting.value = false;

    if (created) {
        // Auto-select the new list so it's included when the user saves.
        selectedIds.value = [...selectedIds.value, created.id];
        creating.value = false;
        newName.value = '';
        createError.value = null;
    } else {
        const fieldErrors = favoriteListsStore.createErrors;
        createError.value =
            (fieldErrors && fieldErrors.name && fieldErrors.name[0]) ||
            favoriteListsStore.createError ||
            'Could not create the list.';
    }
}

async function save() {
    if (!props.show || !selectedIds.value.length) return;
    saving.value = true;
    await favoriteListsStore.addToLists(props.show, selectedIds.value);
    saving.value = false;
    submitted.value = true;
}

function close() {
    emit('close');
}

// Result status helpers
function resultIcon(status) {
    if (status === 'added') return 'success';
    if (status === 'duplicate') return 'warning';
    return 'error';
}

function resultMessage(result) {
    if (result.status === 'added') return `Added to "${result.listName}"`;
    if (result.status === 'duplicate') return `Already in "${result.listName}"`;
    return `Could not save to "${result.listName}"`;
}
</script>

<template>
    <AppDialog
        :open="open"
        :title="show ? `Add '${show.name}' to lists` : 'Add to lists'"
        @close="close"
    >
        <!-- Results view (shown after saving) -->
        <div v-if="submitted" class="space-y-2">
            <ul role="list" class="space-y-1.5">
                <li
                    v-for="result in addResults"
                    :key="result.listId"
                    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    :class="{
                        'bg-green-50 text-green-800': result.status === 'added',
                        'bg-amber-50 text-amber-800': result.status === 'duplicate',
                        'bg-red-50 text-red-800': result.status === 'error',
                    }"
                >
                    <!-- Success icon -->
                    <svg
                        v-if="result.status === 'added'"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 shrink-0 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <!-- Duplicate icon -->
                    <svg
                        v-else-if="result.status === 'duplicate'"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 shrink-0 text-amber-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <!-- Error icon -->
                    <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 shrink-0 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <span>{{ resultMessage(result) }}</span>
                </li>
            </ul>

            <div class="mt-4 flex justify-end">
                <button
                    type="button"
                    class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    @click="close"
                >
                    Done
                </button>
            </div>
        </div>

        <!-- Checklist + inline create view -->
        <div v-else>
            <fieldset v-if="lists.length">
                <legend class="mb-3 text-sm text-gray-600">
                    Select one or more lists to add this show to:
                </legend>
                <ul role="list" class="max-h-64 space-y-1 overflow-y-auto">
                    <li
                        v-for="list in lists"
                        :key="list.id"
                    >
                        <label
                            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                :value="list.id"
                                :checked="selectedIds.includes(list.id)"
                                @change="toggleList(list.id)"
                            />
                            <span class="flex-1 truncate text-gray-900">{{ list.name }}</span>
                            <span class="text-xs text-gray-400">{{ list.favorites_count }}</span>
                        </label>
                    </li>
                </ul>
            </fieldset>

            <p v-else class="text-sm text-gray-600">
                You don't have any lists yet — create one to save this show.
            </p>

            <!-- Inline create-a-list -->
            <div class="mt-3" :class="{ 'border-t border-gray-100 pt-3': lists.length }">
                <button
                    v-if="!creating"
                    type="button"
                    class="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded"
                    @click="enableCreate"
                >
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New list
                </button>

                <div v-else class="space-y-2">
                    <label for="selector-new-list" class="sr-only">New list name</label>
                    <input
                        id="selector-new-list"
                        ref="createInput"
                        v-model="newName"
                        type="text"
                        placeholder="New list name…"
                        maxlength="255"
                        :disabled="createSubmitting"
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
                        :aria-invalid="createError ? 'true' : undefined"
                        :aria-describedby="createError ? 'selector-new-list-error' : undefined"
                        @keydown.enter.prevent="submitCreate"
                    />
                    <p
                        v-if="createError"
                        id="selector-new-list-error"
                        role="alert"
                        class="text-xs text-red-600"
                    >
                        {{ createError }}
                    </p>
                    <div class="flex gap-2">
                        <button
                            type="button"
                            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                            :disabled="createSubmitting || !newName.trim()"
                            @click="submitCreate"
                        >
                            <span v-if="createSubmitting">Creating…</span>
                            <span v-else>Create &amp; select</span>
                        </button>
                        <button
                            v-if="lists.length"
                            type="button"
                            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            :disabled="createSubmitting"
                            @click="cancelCreate"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <div class="mt-4 flex justify-end gap-3">
                <button
                    type="button"
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    :disabled="saving"
                    @click="close"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                    :disabled="saving || selectedIds.length === 0"
                    @click="save"
                >
                    <span v-if="saving">Saving…</span>
                    <span v-else>Add to {{ selectedIds.length }} list{{ selectedIds.length === 1 ? '' : 's' }}</span>
                </button>
            </div>
        </div>
    </AppDialog>
</template>
