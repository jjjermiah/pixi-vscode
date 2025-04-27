/**
 * This module provides a Deferred implementation which allows you to create a promise
 * and control its resolution and rejection externally. This can be useful in scenarios
 * where you need to manage asynchronous operations manually.
 * 
 * Usage:
 * const deferred = createDeferred<string>();
 * deferred.promise.then(value => console.log(value)).catch(error => console.error(error));
 * 
 * // Resolve the promise
 * deferred.resolve('Success');
 * 
 * // Reject the promise
 * deferred.reject('Error');
 */

export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly completed: boolean;

  /**
   * Resolves the promise with the given value.
   * @param value - The value to resolve the promise with.
   */
  resolve(value?: T | PromiseLike<T>): void;

  /**
   * Rejects the promise with the given reason.
   * @param reason - The reason for rejecting the promise.
   */
  reject(reason?: string | Error | Record<string, unknown> | unknown): void;
}

class DeferredImpl<T> implements Deferred<T> {
  promise: Promise<T>;
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: string | Error | Record<string, unknown> | unknown) => void;
  resolved: boolean = false;
  rejected: boolean = false;
  completed: boolean = false;

  constructor() {
      this.promise = new Promise<T>((resolve, reject) => {
          this._resolve = resolve;
          this._reject = reject;
      });
  }

  /**
   * Resolves the promise with the given value.
   * @param value - The value to resolve the promise with.
   */
  resolve(value: T | PromiseLike<T>): void {
      if (!this.completed) {
          this._resolve(value);
          this.resolved = true;
          this.completed = true;
      }
  }

  /**
   * Rejects the promise with the given reason.
   * @param reason - The reason for rejecting the promise.
   */
  reject(reason?: string | Error | Record<string, unknown> | unknown): void {
      if (!this.completed) {
          this._reject(reason);
          this.rejected = true;
          this.completed = true;
      }
  }
}

/**
 * Creates a new Deferred object.
 * @returns A Deferred object.
 */
export function createDeferred<T>(): Deferred<T> {
  return new DeferredImpl<T>();
}