import { Component, OnInit } from '@angular/core';
import { DeletedFilesService } from '../delete-files.service';
import { catchError, Observable, of, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FolderService } from '../folder.service'; 
import { AuthService } from '../auth.service';
import { HttpHeaders } from '@angular/common/http';


@Component({
  selector: 'app-delete',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.css'],
})

export class DeleteComponent implements OnInit {
  deletedFiles: any[] = []; // Array to hold deleted files
  userId!: string;
  selectedFiles: number[] = []; // IDs of selected files
  allSelected = false;

  constructor(
    private folderService: FolderService, 
    private authService: AuthService
  ) {}

  // Helper function to retrieve CSRF token from cookies
  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  }

  ngOnInit(): void {
    this.fetchDeletedFiles();
    this.getUserIdAndFetchDeletedFiles();
  }

  // Fetch user ID from the AuthService and then fetch deleted files
  getUserIdAndFetchDeletedFiles(): void {
    this.authService.getProfile(this.authService.getToken() || '').subscribe(
      (profile) => {
        this.userId = profile.id;  // Ensure the correct field name is used for user ID
        if (this.userId) {
          this.fetchDeletedFiles();  // Only call if userId is valid
        } else {
          console.error('User ID is undefined!');
        }
      },
      (error) => {
        console.error('Error fetching user profile:', error);
      }
    );
  }

  // Fetch deleted files from the API for the current logged-in user
  fetchDeletedFiles(): void {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Token ${this.authService.getToken() || ''}`
    );
  
    this.folderService.getDeletedFiles(this.userId, headers).subscribe(
      (files: any[]) => {
        console.log('Fetched Deleted Files:', files);
        this.deletedFiles = files || []; // Update deleted files list
      },
      (error) => {
        console.error('Error fetching deleted files:', error);
      }
    );
  }  
  
  // Restore a file
  restoreFile(fileId: number): void {
    const fileIds = [fileId]; // Convert to an array for API compatibility
  
    this.folderService.restoreFiles(fileIds).subscribe(
      (response) => {
        console.log('File restored successfully!', response);
  
        // Handle partial failures
        if (response.failed && response.failed.length > 0) {
          console.error('Restore failed for file:', response.failed[0]);
          alert(`Restore failed: ${response.failed[0].error}`);
        } else {
          alert('File restored successfully!');
        }
  
        // Refresh the deleted files list after restoring
        this.fetchDeletedFiles();
      },
      (error: HttpErrorResponse) => {
        console.error('Error restoring file:', error.message);
        alert('Failed to restore the file. Please try again.');
      }
    );
  }
  
  
  
   // Restore selected files
   restoreSelectedFiles(): void {
    const fileIds = this.selectedFiles;
  
    if (!fileIds.length) {
      console.warn('No files selected for restoration.');
      return;
    }
  
    // Optimistically update UI
    const restoredFiles = this.deletedFiles.filter(file => fileIds.includes(file.id));
    this.deletedFiles = this.deletedFiles.filter(file => !fileIds.includes(file.id));
  
    this.folderService.restoreFiles(fileIds).subscribe(
      (response) => {
        console.log(`Restored ${fileIds.length} files successfully:`, response);
  
        // Handle failed restorations
        if (response.failed && response.failed.length > 0) {
          console.error('Restore failed for some files:', response.failed);
          const failedIds = response.failed.map((f: { file_id: any }) => f.file_id);
          restoredFiles.forEach(file => {
            if (failedIds.includes(file.id)) {
              this.deletedFiles.push(file); // Re-add failed files
            }
          });
        }
  
        // Refresh file list
        this.fetchDeletedFiles();
        this.selectedFiles = [];
      },
      (error: HttpErrorResponse) => {
        console.error('Error restoring selected files:', error.message);
        // Revert UI in case of failure
        this.deletedFiles = [...this.deletedFiles, ...restoredFiles];
      }
    );
  }
  
   

   
  // Permanently delete a file
  permanentlyDeleteFile(fileId: number): void {
    const headers = new HttpHeaders().set('X-CSRFToken', this.getCookie('csrftoken'));
  
    if (confirm('Are you sure you want to permanently delete this file? This action cannot be undone.')) {
      this.folderService.permanentlyDeleteFile(fileId, headers).subscribe(
        () => {
          console.log(`File ID ${fileId} permanently deleted!`);
          this.fetchDeletedFiles(); // Refresh UI
        },
        (error: HttpErrorResponse) => {
          console.error(`Error permanently deleting file ID ${fileId}:`, error.message);
        }
      );
    }
  }
  

// Delete selected files permanently
deleteSelectedFiles(): void {
  const headers = new HttpHeaders().set('X-CSRFToken', this.getCookie('csrftoken'));

  if (!this.selectedFiles.length) {
    console.warn('No files selected for permanent deletion.');
    return;
  }

  if (confirm('Are you sure you want to permanently delete these files? This action cannot be undone.')) {
    const fileIds = this.selectedFiles; // Get selected file IDs

    this.folderService.permanentlyDeleteMultipleFiles(fileIds, headers).subscribe(
      (response) => {
        console.log(`Permanently deleted ${fileIds.length} files successfully.`);
        this.fetchDeletedFiles(); // Refresh UI
      },
      (error: HttpErrorResponse) => {
        console.error('Error permanently deleting files:', error.message);
      }
    );
  }
}


  // Empty the trash
  emptyTrash(): void {
    const headers = new HttpHeaders().set('X-CSRFToken', this.getCookie('csrftoken'));
  
    if (confirm('Are you sure you want to permanently delete all files in the trash? This action cannot be undone.')) {
      this.folderService.emptyTrash(headers).subscribe(
        () => {
          alert('Trash emptied successfully!');
          this.fetchDeletedFiles(); // Refresh deleted files list
        },
        (error: HttpErrorResponse) => {
          console.error('Error emptying trash:', error.message);
          alert('Failed to empty trash. Please try again.');
        }
      );
    }
  }
  

  // Toggle selection of an individual file
  toggleSelection(fileId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedFiles.push(fileId);
    } else {
      this.selectedFiles = this.selectedFiles.filter((id) => id !== fileId);
    }
    this.updateSelectAllState();
  }
  
  toggleSelectAll(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.allSelected = isChecked;
  
    if (isChecked) {
      this.selectedFiles = this.deletedFiles.map((file) => file.id);
    } else {
      this.selectedFiles = [];
    }
  }
  
  updateSelectAllState(): void {
    this.allSelected =
      this.selectedFiles.length === this.deletedFiles.length &&
      this.selectedFiles.length > 0;
  }
}

  

