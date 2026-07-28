import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, mergeMap, retry, throwError, timer, timeout, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { BackendStatusService } from '../services/backend-status.service';
import { GlobalLoadingService } from '../services/global-loading.service';

const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl);
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof HttpErrorResponse) return RETRYABLE_STATUSES.has(error.status);
  return error instanceof Error && error.name === 'TimeoutError';
}

export const backendStartupInterceptor: HttpInterceptorFn = (request, next) => {
  const backendStatus = inject(BackendStatusService);
  const loading = inject(GlobalLoadingService);
  const healthUrl = `${environment.apiUrl}/health`;

  if (!isApiRequest(request.url) || request.url === healthUrl) return next(request);

  return defer(() => backendStatus.ensureBackendReady()).pipe(
    mergeMap(() => {
      loading.begin();
      return next(request).pipe(
        timeout(35_000),
        retry({
          count: RETRYABLE_METHODS.has(request.method) ? 3 : 0,
          delay: (error, retryCount) => shouldRetry(error)
            ? timer(2_000 * retryCount)
            : throwError(() => error)
        }),
        finalize(() => loading.end())
      );
    })
  );
};
