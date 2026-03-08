/**
 * FreeLang Standard Library: std/event
 *
 * Event emitter utilities
 */

export type EventListener = (...args: any[]) => void;

/**
 * Simple Event Emitter
 */
export class EventEmitter {
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private maxListeners: number = 10;

  /**
   * Register event listener
   * @param event Event name
   * @param listener Callback function
   */
  on(event: string, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Register one-time event listener
   * @param event Event name
   * @param listener Callback function
   */
  once(event: string, listener: EventListener): void {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param listener Callback function to remove
   */
  off(event: string, listener: EventListener): void {
    const evtListeners = this.eventListeners.get(event);
    if (evtListeners) {
      evtListeners.delete(listener);
      if (evtListeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for event
   * @param event Optional event name (all if not specified)
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  /**
   * Emit event
   * @param event Event name
   * @param args Arguments to pass to listeners
   * @returns true if event had listeners
   */
  emit(event: string, ...args: any[]): boolean {
    const evtListeners = this.eventListeners.get(event);
    if (!evtListeners || evtListeners.size === 0) {
      return false;
    }

    const listenerArray: EventListener[] = [];
    evtListeners.forEach((listener) => {
      listenerArray.push(listener);
    });

    for (const listener of listenerArray) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }

    return true;
  }

  /**
   * Get listener count
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.eventListeners.get(event)?.size ?? 0;
  }

  /**
   * Get all listeners
   * @param event Event name
   * @returns Array of listeners
   */
  getListeners(event: string): EventListener[] {
    const evtListeners = this.eventListeners.get(event);
    if (!evtListeners) return [];
    const result: EventListener[] = [];
    evtListeners.forEach((listener) => {
      result.push(listener);
    });
    return result;
  }

  /**
   * Get all event names
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.eventListeners.keys());
  }

  /**
   * Set max listeners warning
   * @param n Max listeners
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  /**
   * Get max listeners
   * @returns Max listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

/**
 * Create new EventEmitter
 * @returns New EventEmitter instance
 */
export function create(): EventEmitter {
  return new EventEmitter();
}
