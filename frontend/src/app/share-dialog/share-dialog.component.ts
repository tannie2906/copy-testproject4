import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FileService } from '../services/file.service';


@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.css'],
})
export class ShareDialogComponent {
  email: string = '';
  password: string = '';
  allowDownload: boolean = false;
  oneTimeView: boolean = false


  constructor(
    private fileService: FileService,
    public dialogRef: MatDialogRef<ShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { fileId: number }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onShare(): void {
    if (this.email) {
      const payload = {
        email: this.email,
        password: this.password || null,
        allow_download: this.allowDownload,
        one_time_view: this.oneTimeView
      };

      this.fileService.shareFile(this.data.fileId, payload).subscribe({
        next: (response) => {
          alert('File shared successfully! Note: The link is valid for 24 hours.');
          this.dialogRef.close();
        },
        error: (err) => {
          console.error('Error sharing file:', err);
          alert('Failed to share the file.');
        }
      });
    }
  }
}