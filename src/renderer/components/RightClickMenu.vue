<template>
  <div @contextmenu.prevent.stop="show($event)">
    <!-- default slot -->
    <slot name="default" />
    <!-- right menu -->
    <div
      ref="menu"
      class="qii404-vue-right-menu"
    >
      <ul>
        <li
          v-for="item of items"
          @click.stop="clickItem($event, item)"
        >
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: Array,
  clickValue: [String, Object],
});

const menu = ref(null);
let triggerEvent = null;

const show = ($event) => {
  triggerEvent = $event;
  showMenus($event.clientX, $event.clientY);
  document.addEventListener('click', removeMenus);
};

const showMenus = (x, y) => {
  hideAllMenus();

  menu.value.style.left = `${x}px`;
  menu.value.style.top = `${y - 5}px`;
  menu.value.style.display = 'block';
};

const clickItem = ($event, item) => {
  if (item.click) {
    item.click(props.clickValue, triggerEvent, $event);
  }

  removeMenus();
  triggerEvent = null;
};

const removeMenus = () => {
  document.removeEventListener('click', removeMenus);
  hideAllMenus();
};

const hideAllMenus = () => {
  const menus = document.querySelectorAll('.qii404-vue-right-menu');

  if (menus.length === 0) {
    return;
  }

  for (const m of menus) {
    m.style.display = 'none';
  }
};

defineExpose({
  show,
});
</script>

<style type="text/css">
  .qii404-vue-right-menu {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    padding: 0px;
    z-index: 99999;
    overflow: hidden;
    border-radius: 3px;
    border: 2px solid lightgrey;
    background: #fafafa;
  }
  .dark-mode .qii404-vue-right-menu {
    background: #263238;
  }

  .qii404-vue-right-menu ul {
    list-style: none;
    padding: 0px;
  }
  .qii404-vue-right-menu ul li:not(:last-child) {
    border-bottom: 1px solid lightgrey;
  }

  .qii404-vue-right-menu ul li {
    font-size: 13.4px;
    padding: 6px 10px;
    cursor: pointer;
    color: #263238;
  }
  .dark-mode .qii404-vue-right-menu ul li {
    color: #fff;
  }

  .qii404-vue-right-menu ul li:hover {
    background: #e4e2e2;
  }
  .dark-mode .qii404-vue-right-menu ul li:hover {
    background: #344A4E;
  }
</style>
