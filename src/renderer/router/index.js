import { createRouter, createWebHashHistory } from 'vue-router';
import Tabs from '@/components/Tabs';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Tabs',
      component: Tabs,
    },
  ],
});
