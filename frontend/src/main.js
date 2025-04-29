import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Tooltip from 'primevue/tooltip';
import Dialog from 'primevue/dialog';
import ProgressBar from 'primevue/progressbar';
import Tag from 'primevue/tag';

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { onError } from '@apollo/client/link/error';

import '@/assets/styles.scss';

// Import the timer composable
import { useTimer } from '@/views/uikit/timer';

// HTTP Link Configuration
const httpLink = createHttpLink({
  uri: 'http://localhost:3000/graphql',
});

// Enhanced Error Handling
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, path }) => {
      console.error(`[GraphQL error] Path: ${path}, message: ${message}`);
    });
  }

  if (networkError) {
    console.error('[Network error]', networkError);
  }
});

// Apollo Client Configuration
export const apolloClient = new ApolloClient({
  link: errorLink.concat(httpLink),
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NODE_ENV !== 'production',
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-first',
    },
  },
});

// App Creation
const app = createApp(App);

// Initialize the timer globally
const { restoreTimerState } = useTimer();
restoreTimerState(); // Restore the timer state when the app starts

// Plugins Registration
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);

// Provide Apollo Client
app.provide(DefaultApolloClient, apolloClient);

// Register components and directives
app.component('Button', Button);
app.component('Dropdown', Dropdown);
app.component('Dialog', Dialog);
app.component('ProgressBar', ProgressBar);
app.component('Tag', Tag);
app.directive('tooltip', Tooltip);

// Mount the app
app.mount('#app');

