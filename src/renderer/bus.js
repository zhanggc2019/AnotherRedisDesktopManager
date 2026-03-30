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
    const wrapped = (payload) => {
      emitter.off(event, wrapped);
      handler(payload);
    };

    emitter.on(event, wrapped);
  },
  $emit(event, ...args) {
    // mitt only supports a single payload argument
    // If multiple arguments are passed, wrap them in an array
    if (args.length === 0) {
      emitter.emit(event);
    } else if (args.length === 1) {
      emitter.emit(event, args[0]);
    } else {
      emitter.emit(event, args);
    }
  },
};
