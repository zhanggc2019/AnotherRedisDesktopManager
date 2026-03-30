<template>
  <transition name="bounce">
    <div
      v-if="toTopShow"
      class="to-top-container"
      :style="style"
      @click="scrollToTop"
    >
      <ElementIcon name="el-icon-to-top" />
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import ElementIcon from '@/components/ElementIcon.vue';

const props = defineProps({
  parentNum: { type: Number, default: 3 },
  posRight: { type: Boolean, default: true },
});

const toTopShow = ref(false);
const scrollTop = ref(0);
const realDom = ref(null);
const minShowHeight = 500;

const style = computed(() => {
  const styleObj = { right: '50px' };

  if (!props.posRight) {
    styleObj.right = 'inherit';
  }

  return styleObj;
});

const handleScroll = () => {
  scrollTop.value = realDom.value.scrollTop;
  toTopShow.value = (scrollTop.value > minShowHeight);
};

const scrollToTop = () => {
  let timer = null;

  cancelAnimationFrame(timer);

  timer = requestAnimationFrame(function fn() {
    const nowTop = realDom.value.scrollTop;

    // to top already
    if (nowTop <= 0) {
      cancelAnimationFrame(timer);
      toTopShow.value = false;
    } else if (nowTop < 50) {
      realDom.value.scrollTop -= 5;
      timer = requestAnimationFrame(fn);
    } else {
      realDom.value.scrollTop -= nowTop * 0.2;
      timer = requestAnimationFrame(fn);
    }
  });
};

onMounted(() => {
  nextTick(() => {
    let vueCom = null;
    // Get parent component element
    const currentElement = document.currentScript?.parentElement;
    
    // Traverse up the component tree to find the scroll container
    let element = currentElement;
    for (let i = 0; i < props.parentNum - 1; i++) {
      if (!element?.parentElement) {
        return;
      }
      element = element.parentElement;
    }

    realDom.value = element;

    if (!realDom.value) {
      return;
    }
    realDom.value.addEventListener('scroll', handleScroll, true);
  });
});

onUnmounted(() => {
  realDom.value && realDom.value.removeEventListener('scroll', handleScroll, true);
});
</script>

<style type="text/css">
  .to-top-container {
    background-color: #409eff;
    position: fixed;
    /*right: 50px;*/
    bottom: 30px;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    cursor: pointer;
    transition: .3s;
    box-shadow: 0 3px 6px rgba(0, 0, 0, .5);
    opacity: .5;
    z-index: 10000;
  }
  .to-top-container:hover{
    opacity: 1;
  }
  .to-top-container .el-icon{
    color: #fff;
    display: block;
    line-height: 40px;
    text-align: center;
    font-size: 18px;
  }
  .bounce-enter-active {
    animation: bounce-in .5s;
  }
  .bounce-leave-active {
    animation: bounce-in .5s reverse;
  }
  @keyframes bounce-in {
    0% {
      transform: scale(0);
    }
    50% {
      transform: scale(1.5);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
