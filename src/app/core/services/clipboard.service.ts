import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  constructor(private toastService: ToastService) {}

  public copy(text: string, successMsg = 'Copied to clipboard!'): void {
    if (!text) {
      this.toastService.show('Nothing to copy!', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => {
        this.toastService.show(successMsg, 'success');
      },
      (err) => {
        this.toastService.show('Failed to copy: ' + err, 'error');
      }
    );
  }
}
