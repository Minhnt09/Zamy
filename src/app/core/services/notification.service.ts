import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<Notification[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(message: string): void {
    this.show(message, 'success');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.notifications.update(items => items.filter(item => item.id !== id));
  }

  private show(message: string, type: NotificationType): void {
    const id = ++this.nextId;
    this.notifications.update(items => [...items, { id, message, type }]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), 3_500));
  }
}
