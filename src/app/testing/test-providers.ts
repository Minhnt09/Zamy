import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

const emptyParamMap = convertToParamMap({});

/** Shared, in-memory dependencies for standalone component smoke tests. */
export const testProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  {
    provide: ActivatedRoute,
    useValue: {
      params: of({}),
      paramMap: of(emptyParamMap),
      queryParams: of({}),
      queryParamMap: of(emptyParamMap),
      snapshot: {
        params: {},
        paramMap: emptyParamMap,
        queryParams: {},
        queryParamMap: emptyParamMap
      }
    }
  }
];
