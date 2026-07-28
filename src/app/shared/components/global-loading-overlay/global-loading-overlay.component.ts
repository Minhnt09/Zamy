import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { BackendStatusService } from '../../../core/services/backend-status.service';
import { GlobalLoadingService } from '../../../core/services/global-loading.service';

@Component({
  selector: 'app-global-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-loading-overlay.component.html',
  styleUrl: './global-loading-overlay.component.scss'
})
export class GlobalLoadingOverlayComponent {
  readonly backendStatus = inject(BackendStatusService);
  private readonly loading = inject(GlobalLoadingService);
  readonly isVisible = computed(() => this.backendStatus.isWakingUp() || this.loading.isLoading() || this.backendStatus.hasStartupProblem());
}
