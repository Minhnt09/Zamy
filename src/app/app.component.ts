import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackendStatusService } from './core/services/backend-status.service';
import { GlobalLoadingOverlayComponent } from './shared/components/global-loading-overlay/global-loading-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoadingOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'my-app';
  private readonly backendStatus = inject(BackendStatusService);

  ngOnInit(): void {
    // Starts exactly once for a normal SPA boot. Concurrent API calls share it.
    this.backendStatus.ensureBackendReady().subscribe({ error: () => undefined });
  }
}
