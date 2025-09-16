import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

if (import.meta.env.PROD) {
  import('@vercel/analytics').then(({ inject }) => inject());
}

app.mount('#app');
