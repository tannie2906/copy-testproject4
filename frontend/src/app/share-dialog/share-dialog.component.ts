import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FileService } from '/Users/intan/testproject/frontend/src/app/services/file.service';

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.css'],
})
export class ShareDialogComponent {
  email: string = '';

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
      this.dialogRef.close(this.email); // Pass email to parent component
    }
  }
}