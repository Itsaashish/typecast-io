import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {
  constructor(private toastService: ToastService) {}

  public downloadFile(content: string, filename: string): void {
    if (!content) {
      this.toastService.show('No content to download!', 'warning');
      return;
    }
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.toastService.show(`Downloaded ${filename} successfully!`, 'success');
    } catch (err: any) {
      this.toastService.show('Failed to download: ' + err.message, 'error');
    }
  }
}
