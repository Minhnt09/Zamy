import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalLoadingOverlayComponent } from './shared/components/global-loading-overlay/global-loading-overlay.component';
import { NotificationContainerComponent } from './shared/components/notification-container/notification-container.component';
import { AuthService } from './features/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoadingOverlayComponent, NotificationContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'my-app';
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.loadCurrentUser().subscribe();
  }
}
