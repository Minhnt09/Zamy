import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize, retry, throwError, timer, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { inject } from '@angular/core';
import { GlobalLoadingService } from '../services/global-loading.service';

const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);
const RETRY_DELAYS_MS = [3_000, 8_000];
const REQUEST_TIMEOUT_MS = 30_000;

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl);
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function shouldRetry(error: unknown): boolean {
  if (!isOnline()) return false;
  if (error instanceof HttpErrorResponse) return error.status === 0 || RETRYABLE_STATUSES.has(error.status);
  return error instanceof Error && error.name === 'TimeoutError';
}

function offlineError(requestUrl: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: 0, statusText: 'Offline', url: requestUrl, error: { code: 'OFFLINE' } });
}

/**
 * Cold-start resilience applies directly to safe reads. It intentionally never
 * waits for /health, so API requests themselves wake a Render free instance.
 */
export const backendStartupInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) return next(request);

  if (!RETRYABLE_METHODS.has(request.method)) {
    const loading = inject(GlobalLoadingService);
    return defer(() => {
      loading.begin();
      return next(request).pipe(finalize(() => loading.end()));
    });
  }

  if (!isOnline()) return throwError(() => offlineError(request.url));

  return next(request).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    retry({
      count: RETRY_DELAYS_MS.length,
      delay: (error, retryCount) => shouldRetry(error)
        ? timer(RETRY_DELAYS_MS[retryCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1])
        : throwError(() => error)
    })
  );
};

export const coldStartRequestPolicy = { timeoutMs: REQUEST_TIMEOUT_MS, retryDelaysMs: RETRY_DELAYS_MS };
