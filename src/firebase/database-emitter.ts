'use client';

type Callback<T> = (data: T) => void;

interface DBChangeEvent {
  table: string;
}

function createDBEmitter() {
  const events: Array<Callback<DBChangeEvent>> = [];

  return {
    on(callback: Callback<DBChangeEvent>) {
      events.push(callback);
    },
    off(callback: Callback<DBChangeEvent>) {
      const idx = events.indexOf(callback);
      if (idx !== -1) {
        events.splice(idx, 1);
      }
    },
    emit(event: DBChangeEvent) {
      events.forEach(cb => {
        try {
          cb(event);
        } catch (e) {
          console.error('DBEmitter callback error:', e);
        }
      });
    }
  };
}

export const dbEmitter = createDBEmitter();
