import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// Pinia is registered here as the shared-state manager for shows and
// favoriteLists stores (DECISIONS.md #11). It is the first frontend dependency
// added to this project and is justified by the need to keep search
// query/results/loading/error and (in Phase 4) favorite-list state synchronized
// across components without prop-drilling.
createApp(App)
    .use(createPinia())
    .mount('#app');
