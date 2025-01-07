import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-share-dialog',
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.css'],
})
export class ShareDialogComponent {
  email: string = '';

  constructor(
    public dialogRef: MatDialogRef<ShareDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { fileId: number }
  ) {}

  onCancel(): void {
    this.dialogRef.close(); // Close the dialog without taking action
  }

  onShare(): void {
    if (this.email) {
      this.dialogRef.close(this.email); // Return the email to the parent component
    }
  }
}
