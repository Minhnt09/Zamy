import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GlobalLoadingService {
  private activeBlockingActions = 0;
  private visibleBlockingActions = signal(0);
  private showTimer?: ReturnType<typeof setTimeout>;
  readonly isLoading = computed(() => this.visibleBlockingActions() > 0);

  beginBlocking(): void {
    this.activeBlockingActions += 1;
    if (this.activeBlockingActions === 1) {
      this.showTimer = setTimeout(() => {
        this.showTimer = undefined;
        if (this.activeBlockingActions > 0) this.visibleBlockingActions.set(this.activeBlockingActions);
      }, 180);
    }
  }

  endBlocking(): void {
    this.activeBlockingActions = Math.max(0, this.activeBlockingActions - 1);
    if (this.activeBlockingActions === 0) {
      if (this.showTimer) clearTimeout(this.showTimer);
      this.showTimer = undefined;
      this.visibleBlockingActions.set(0);
    } else if (this.visibleBlockingActions() > 0) {
      this.visibleBlockingActions.set(this.activeBlockingActions);
    }
  }
}
