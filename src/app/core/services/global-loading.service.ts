import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GlobalLoadingService {
  private activeRequests = 0;
  private visibleRequests = signal(0);
  private showTimer?: ReturnType<typeof setTimeout>;
  readonly isLoading = computed(() => this.visibleRequests() > 0);

  begin(): void {
    this.activeRequests += 1;
    if (this.activeRequests === 1) {
      this.showTimer = setTimeout(() => {
        this.showTimer = undefined;
        if (this.activeRequests > 0) this.visibleRequests.set(this.activeRequests);
      }, 180);
    }
  }

  end(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      if (this.showTimer) clearTimeout(this.showTimer);
      this.showTimer = undefined;
      this.visibleRequests.set(0);
    } else if (this.visibleRequests() > 0) {
      this.visibleRequests.set(this.activeRequests);
    }
  }
}
