import { EventEmitter } from 'events';

// A simple, shared event emitter for development mode polling.
// This allows the polling process (started on import) to communicate
// with the webhook handler (created in the user's API route).
export const devPollingBus = new EventEmitter();
