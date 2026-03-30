import { describe, it, expect, beforeEach } from 'vitest';
import bus from './bus';

describe('bus.js - Event Bus Implementation', () => {
  beforeEach(() => {
    // Clear all listeners before each test
    bus._emitter?.all?.clear?.();
  });

  describe('$on method', () => {
    it('should register an event listener', () => {
      const handler = () => {};
      bus.$on('test-event', handler);
      // Verify listener is registered by checking if emit triggers it
      let called = false;
      bus.$on('test-event', () => {
        called = true;
      });
      bus.$emit('test-event');
      expect(called).toBe(true);
    });

    it('should call handler when event is emitted', () => {
      let called = false;
      const handler = () => {
        called = true;
      };
      bus.$on('test-event', handler);
      bus.$emit('test-event');
      expect(called).toBe(true);
    });

    it('should pass single payload to handler', () => {
      let receivedPayload = null;
      const handler = (payload) => {
        receivedPayload = payload;
      };
      bus.$on('test-event', handler);
      bus.$emit('test-event', { data: 'test' });
      expect(receivedPayload).toEqual({ data: 'test' });
    });

    it('should pass multiple arguments as array to handler', () => {
      let receivedPayload = null;
      const handler = (payload) => {
        receivedPayload = payload;
      };
      bus.$on('test-event', handler);
      bus.$emit('test-event', 'arg1', 'arg2', 'arg3');
      expect(receivedPayload).toEqual(['arg1', 'arg2', 'arg3']);
    });
  });

  describe('$off method', () => {
    it('should unregister an event listener', () => {
      let callCount = 0;
      const handler = () => {
        callCount++;
      };
      bus.$on('test-event', handler);
      bus.$emit('test-event');
      expect(callCount).toBe(1);

      bus.$off('test-event', handler);
      bus.$emit('test-event');
      expect(callCount).toBe(1); // Should not increment
    });

    it('should not affect other listeners', () => {
      let handler1Called = false;
      let handler2Called = false;

      const handler1 = () => {
        handler1Called = true;
      };
      const handler2 = () => {
        handler2Called = true;
      };

      bus.$on('test-event', handler1);
      bus.$on('test-event', handler2);

      bus.$off('test-event', handler1);
      bus.$emit('test-event');

      expect(handler1Called).toBe(false);
      expect(handler2Called).toBe(true);
    });
  });

  describe('$emit method', () => {
    it('should emit an event', () => {
      let called = false;
      bus.$on('test-event', () => {
        called = true;
      });
      bus.$emit('test-event');
      expect(called).toBe(true);
    });

    it('should emit event with single payload', () => {
      let receivedPayload = null;
      bus.$on('test-event', (payload) => {
        receivedPayload = payload;
      });
      bus.$emit('test-event', { message: 'hello' });
      expect(receivedPayload).toEqual({ message: 'hello' });
    });

    it('should emit event with multiple arguments as array', () => {
      let receivedPayload = null;
      bus.$on('test-event', (payload) => {
        receivedPayload = payload;
      });
      bus.$emit('test-event', 'arg1', 'arg2', 'arg3');
      expect(receivedPayload).toEqual(['arg1', 'arg2', 'arg3']);
    });

    it('should call all registered listeners for the same event', () => {
      let count = 0;
      bus.$on('test-event', () => {
        count++;
      });
      bus.$on('test-event', () => {
        count++;
      });
      bus.$emit('test-event');
      expect(count).toBe(2);
    });
  });

  describe('$once method', () => {
    it('should register a one-time listener', () => {
      let callCount = 0;
      const handler = () => {
        callCount++;
      };
      bus.$once('test-event', handler);
      bus.$emit('test-event');
      bus.$emit('test-event');
      expect(callCount).toBe(1);
    });

    it('should pass single payload to one-time handler', () => {
      let receivedPayload = null;
      bus.$once('test-event', (payload) => {
        receivedPayload = payload;
      });
      bus.$emit('test-event', { data: 'once' });
      expect(receivedPayload).toEqual({ data: 'once' });
    });

    it('should pass multiple arguments as array to one-time handler', () => {
      let receivedPayload = null;
      bus.$once('test-event', (payload) => {
        receivedPayload = payload;
      });
      bus.$emit('test-event', 'arg1', 'arg2');
      expect(receivedPayload).toEqual(['arg1', 'arg2']);
    });

    it('should not interfere with regular listeners', () => {
      let onceCount = 0;
      let regularCount = 0;

      bus.$once('test-event', () => {
        onceCount++;
      });
      bus.$on('test-event', () => {
        regularCount++;
      });

      bus.$emit('test-event');
      bus.$emit('test-event');

      expect(onceCount).toBe(1);
      expect(regularCount).toBe(2);
    });
  });

  describe('Integration tests', () => {
    it('should handle multiple events independently', () => {
      let event1Called = false;
      let event2Called = false;

      bus.$on('event1', () => {
        event1Called = true;
      });
      bus.$on('event2', () => {
        event2Called = true;
      });

      bus.$emit('event1');
      expect(event1Called).toBe(true);
      expect(event2Called).toBe(false);

      bus.$emit('event2');
      expect(event2Called).toBe(true);
    });

    it('should handle complex event flow', () => {
      const events = [];

      bus.$on('start', () => {
        events.push('start');
      });

      bus.$once('middle', () => {
        events.push('middle');
      });

      bus.$on('end', () => {
        events.push('end');
      });

      bus.$emit('start');
      bus.$emit('middle');
      bus.$emit('middle'); // Should not trigger again
      bus.$emit('end');

      expect(events).toEqual(['start', 'middle', 'end']);
    });
  });
});
