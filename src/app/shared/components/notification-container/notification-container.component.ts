import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Notification, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-container.component.html',
  styleUrl: './notification-container.component.scss'
})
export class NotificationContainerComponent {
  readonly notificationService = inject(NotificationService);

  dismiss(notification: Notification): void {
    this.notificationService.dismiss(notification.id);
  }
}
