import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';

@Component({
  selector: 'app-global-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-loading-overlay.component.html',
  styleUrl: './global-loading-overlay.component.scss'
})
export class GlobalLoadingOverlayComponent {
  private readonly loading = inject(GlobalLoadingService);
  /** Only explicit, blocking workflows may use this overlay. API reads render locally. */
  readonly isVisible = computed(() => this.loading.isLoading());
}
