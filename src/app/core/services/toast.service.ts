import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  public toasts = signal<Toast[]>([]);
  private nextId = 0;

  public show(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', duration = 3000): void {
    const id = this.nextId++;
    const toast: Toast = { id, message, type };
    this.toasts.update(list => [...list, toast]);

    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, duration);
  }
}
