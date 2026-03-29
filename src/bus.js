import mitt from 'mitt';

const emitter = mitt();

export default {
  $on(event, handler) {
    emitter.on(event, handler);
  },
  $off(event, handler) {
    emitter.off(event, handler);
  },
  $once(event, handler) {
    const wrapped = (...args) => {
      emitter.off(event, wrapped);
      handler(...args);
    };

    emitter.on(event, wrapped);
  },
  $emit(event, ...args) {
    emitter.emit(event, ...args);
  },
};
