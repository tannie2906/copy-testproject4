// notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSource = new BehaviorSubject<string[]>([]);  // Stores the notifications
  notifications$ = this.notificationsSource.asObservable();  // Observable to subscribe to

  constructor() {}

  // Add a new notification
  addNotification(message: string) {
    const currentNotifications = this.notificationsSource.value;
    this.notificationsSource.next([...currentNotifications, message]);
  }

  // Optionally, you can clear notifications
  clearNotifications() {
    this.notificationsSource.next([]);
  }
}