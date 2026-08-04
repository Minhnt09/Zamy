import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Opt-in marker for requests that must temporarily prevent duplicate user actions. */
export const BLOCKING_LOADING = new HttpContextToken<boolean>(() => false);

export function blockingLoadingContext(): HttpContext {
  return new HttpContext().set(BLOCKING_LOADING, true);
}
