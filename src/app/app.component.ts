import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackendStatusService } from './core/services/backend-status.service';
import { GlobalLoadingOverlayComponent } from './shared/components/global-loading-overlay/global-loading-overlay.component';
import { NotificationContainerComponent } from './shared/components/notification-container/notification-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoadingOverlayComponent, NotificationContainerComponent],
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
