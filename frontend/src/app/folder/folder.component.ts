import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { FileService, File } from '../services/file.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFile } from '../models/user-file.model'; 
import axios from 'axios';
import { UploadService } from  '../services/upload.service';
import { File as CustomFile } from '../services/file.service';
import { ShareDialogComponent } from '../share-dialog/share-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.css']
})
export class FolderComponent implements OnInit {
  files: any[] = []; // Array to store file data
  errorMessage: string = ''; // For displaying errors
  folderFiles: File[] = [];
  selectedFile: any = null;
  showStarredFiles: boolean = false; // To toggle between main and starred view
  starredFiles: any[] = []; // Holds starred files
  selectedFileId: number | null = null;
  newFileName: string = '';
  apiUrl: string = 'https://127.0.0.1:8000/api';
  uploadDropdownVisible: boolean = false;
  uploading = false;      // Track if upload is in progress
  progress: number | null = null;  // Track progress
  currentFolderId: string | null = null;
  isAuthenticated: boolean = false;
  folders: any;
  @Input() folderId!: string; 
  showShareModal = false;
  shareEmail = '';
  sharePermissions: string | undefined = '';  

   // Get references to file inputs
   @ViewChild('fileInput') fileInput!: ElementRef;
   @ViewChild('folderInput') folderInput!: ElementRef;

  //properties file preview
  showPreview: boolean = false;
  loading: boolean = false;
  fileType: string = '';
  previewUrl: string = '';
  fileSize: string = '';

  // To track sort order for each column
  sortOrder: { [key: string]: 'asc' | 'desc' } = {
    name: 'asc',
    size: 'asc',
    modified: 'asc',
    
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private fileService: FileService,
    private router: Router,
    private uploadService: UploadService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    document.addEventListener('click', this.handleClickOutside.bind(this));
    this.isAuthenticated = !!this.authService.getToken();
    if (!this.isAuthenticated) {
      this.errorMessage = 'You are not authenticated. Please log in.';
      return;
    }
    this.fetchFilesAndFolders();
  }

  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.files.forEach(file => file.showDropdown = false);
    }
  }

  getHeaders() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',  // Ensure Content-Type is application/json
      }),
    };
  }

  // Handle file deletion
  onDelete(file: File, event?: Event): void {
    if (event) {
        event.preventDefault();
    }

    const isDeleted = file.is_deleted; // Check if already deleted

    if (confirm('Are you sure you want to delete this file?')) {
        this.fileService.deleteFile(file.id, isDeleted).subscribe({
          next: () => {
              alert('File deleted successfully.');
              this.fetchFilesAndFolders(); // Refresh the file list
          },
          error: (error) => {
              alert('Failed to delete file: ' + (error.error.message || 'Unknown error.'));
              console.error('Error deleting file:', error);
          },
      });
    }
  }
   
  // Sort files by column
  sortFiles(column: string): void {
    this.sortOrder[column] = this.sortOrder[column] === 'asc' ? 'desc' : 'asc';

    switch (column) {
      case 'name':
        this.files.sort((a, b) =>
          this.sortOrder['name'] === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        );
        break;
      case 'size':
        this.files.sort((a, b) =>
          this.sortOrder['size'] === 'asc' ? a.size - b.size : b.size - a.size
        );
        break;
      case 'modified':
        this.files.sort((a, b) =>
          this.sortOrder['modified'] === 'asc'
            ? new Date(a.created_at).getTime() - new Date(b.upload_date).getTime()
            : new Date(b.upload_date).getTime() - new Date(a.created_at).getTime()
        );
        break;
    }
  }

  // Toggle dropdown visibility for a specific file
  toggleDropdown(file: any): void {
    this.files.forEach(f => {
      if (f !== file) {
        f.showDropdown = false; // Close other dropdowns
      }
    });
  
    file.showDropdown = !file.showDropdown;
  }

  closeDropdown(file: any): void {
    setTimeout(() => {
      file.showDropdown = false;
    }, 200); // Adds a slight delay for a smooth close
  }
  

  // Utility to format the file size to a readable format
  formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1048576) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1073741824) return `${(size / 1048576).toFixed(2)} MB`;
    return `${(size / 1073741824).toFixed(2)} GB`;
  }

  // File download functionality
  onDownload(file: any, event: Event): void {
    event.preventDefault();
  
    const token = this.authService.getToken();
    if (!token) {
      alert('You are not authenticated. Please log in.');
      return;
    }
  
    // Ensure file.id is correctly passed
    if (!file.id) {
      console.error('File ID is missing in the search results:', file);
      alert('Unable to download the file. File ID is missing.');
      return;
    }
  
    this.fileService.downloadFile(file.id, token).subscribe({
      next: (blob) => {
        // Create a URL for the downloaded file
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
  
        // Use the file_name if provided
        a.download = file.file_name || `file-${file.id}`;
        a.click();
  
        // Clean up the URL object
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
  
        // Debugging
        console.error('File object causing error:', file);
  
        alert('Failed to download the file. Please try again.');
      },
    });
  }

  onRename(file: any): void {
    const originalExtension = file.filename.split('.').pop(); // Extract the file extension
    const baseName = file.filename.split('.').slice(0, -1).join('.'); // Extract base name
  
    // Prompt the user with the base name
    const newName = prompt('Enter a new name for the file:', baseName);
    if (!newName || newName.trim() === '') {
      alert('File name cannot be empty.');
      return;
    }
  
    // Recombine base name with the original extension
    const fullNewName = `${newName.trim()}.${originalExtension}`; // Combine new name with extension
  
    // Send the request to the backend
    this.fileService.renameFile(file.id, fullNewName).subscribe({
      next: (response) => {
        file.filename = fullNewName; // Update the UI
        alert('File renamed successfully!');
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error renaming file:', error);
        alert(error.error?.error || 'Failed to rename the file.');
      },
    });
  }
     
  onGetStartedClick(): void {
    this.router.navigate(['/upload']);  // Routes to the upload page (similar to the HomeComponent)
  }

   // Toggle upload dropdown
   toggleUploadDropdown(): void {
    this.uploadDropdownVisible = !this.uploadDropdownVisible;
  }

   // Trigger file input click for files
   onFileUploadClick(): void {
    this.fileInput.nativeElement.click();
  }

  // Handle File Upload (when selecting a file)
  onUploadFile(event: any) {
    const files = event.target.files;
    const formData = new FormData();

    // Loop through each file and add it to the form data
    for (let file of files) {
      formData.append('files', file);
    }

    this.uploadFiles(formData, false);
  }

  uploadFiles(formData: FormData, isFolder: boolean) {
    this.uploading = true;

    this.http.post(`${this.apiUrl}/upload/`, formData, {
      reportProgress: true,
      observe: 'events',
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploading = false;
          this.progress = null;

          // Update files and folders based on server response
          const uploadedFiles = event.body?.files || [];
          uploadedFiles.forEach((file: any) => {
            this.files.push(file);
          });
        }
      },
      error: (error) => {
        this.uploading = false;
        this.progress = null;
        console.error('File upload failed:', error);
      }
    });
  }

  // Fetch files using the service
  getStarredFiles(): void {
    this.fileService.getStarredFiles().subscribe({
      next: (data) => {
        console.log('Fetched Starred Files:', data);
        this.starredFiles = data; // Update starredFiles with the fetched data
      },
      error: (error) => {
        console.error('Error fetching starred files:', error);
      },
    });
  }
  
  // Navigate to Starred Files
  goToStarred(): void {
    this.showStarredFiles = true;
    this.fetchStarredFiles();
  }

  // Fetch Starred Files
  fetchStarredFiles(): void {
    this.fileService.getStarredFiles().subscribe({
      next: (data) => {
        console.log('Fetched Starred Files:', data);
        this.starredFiles = data.map((file: any) => ({
          id: file.id,
          name: file.file_name,
          size: this.formatFileSize(file.size),
          owner: file.user_id?.username || 'Unknown',
          modified: file.created_at,
          isStarred: file.is_starred,
          type: 'file',
        }));
      },
      error: (error) => {
        console.error('Error fetching starred files:', error);
      },
    });
  }
  
  toggleStarredView(): void {
    this.showStarredFiles = !this.showStarredFiles;
    if (this.showStarredFiles) {
      this.fetchStarredFiles();
    }
  }
  
  toggleStar(file: any): void {
    const previousState = file.isStarred;
    file.isStarred = !file.isStarred;
  
    if (file.isStarred) {
      this.starredFiles.push(file); // Add to starred list
    } else {
      this.starredFiles = this.starredFiles.filter(f => f.id !== file.id);
    }
  
    this.fileService.toggleStar(file.id, file.isStarred).subscribe({
      next: () => console.log('Star status updated'),
      error: (error) => {
        console.error('Error toggling star:', error);
        file.isStarred = !file.isStarred;// Revert on failure
        this.fetchStarredFiles(); // Refetch as a fallback
      }
    });
  }
  
  
  loadFiles(): void {
    this.fileService.getFiles().subscribe(
      (files) => {
        this.files = files;
      },
      (error) => {
        console.error('Error loading files:', error);
      }
    );
  }

  async fetchFilesAndFolders() {
    const token = this.authService.getToken();
    try {
      const response = await axios.get('https://127.0.0.1:8000/api/folders/', {
        headers: { Authorization: `Token ${token}` },
      });
      const data = response.data;
  
      // Map files and folders for display
      this.files = [
        ...data.folders.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          modified: folder.created_at, // Ensure 'created_at' exists for folders
          owner: folder.owner?.username || 'Unknown', // Make sure 'owner' and 'username' exist for folders
        })),
        ...data.files.map((file: any) => ({
          id: file.id,
          name: file.file_name,
          size: this.formatFileSize(file.size),
          owner: file.user_id?.username || 'Unknown', // Ensure 'user_id' and 'username' exist
          modified: file.created_at, // 'created_at' for files
          isStarred: file.is_starred,
          isDeleted: file.is_deleted,
          type: 'file',
        })),
      ];
    } catch (error) {
      console.error('Error fetching files and folders:', error);
    }
  }
  
  async renameFile(fileId: number) {
    const token = this.authService.getToken();
  
    // Prompt user for new name
    const originalFileName = this.files.find((file) => file.id === fileId)?.filename || '';
    const fileExtension = originalFileName.split('.').pop(); // Extract the original extension
    const baseName = originalFileName.split('.').slice(0, -1).join('.'); // Base name without extension
  
    const newFileName = window.prompt('Enter new file name:', baseName);
  
    // Validate input
    if (!newFileName || newFileName.trim() === '') {
      alert('File name cannot be empty!');
      return;
    }
  
    // Recombine the new base name with the original extension
    const fullNewName = `${newFileName.trim()}.${fileExtension}`;
    console.log('Full new name:', fullNewName);
  
    const payload = { name: fullNewName }; // Send full name with extension
  
    try {
      // Send request
      await axios.post(
        `https://127.0.0.1:8000/api/rename/${fileId}/`,
        payload,
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      alert('File renamed successfully!');
      this.fetchFilesAndFolders(); // Refresh file list
    } catch (error: unknown) {
      // Cast error as AxiosError
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || 'Failed to rename the file.');
      } else {
        console.error('Unexpected error:', error);
        alert('An unexpected error occurred.');
      }
    }
  }
  
  async deleteFile(fileId: number) {
    const token = this.authService.getToken();
    await axios.post(
      `https://127.0.0.1:8000/api/delete/${fileId}/`,
      {},
      {
        headers: { Authorization: `Token ${token}` },
      }
    );
    alert('File moved to trash.');
    this.fetchFilesAndFolders();
  }

 

  //file review
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  shareFile(fileId: number): void {
    const dialogRef = this.dialog.open(ShareDialogComponent, {
      width: '400px',
      data: { fileId },
    });

    dialogRef.afterClosed().subscribe((email) => {
      if (email) {
        this.fileService.shareFile(fileId, email).subscribe(
          () => alert('File shared successfully!'),
          (error) => alert('Error sharing file: ' + error.message)
        );
      }
    });
  }
  
  onOpenFile(file: any): void {
    this.router.navigate([`/files/view/${file.id}`]);
  }

  get selectedFileNameWithoutExtension(): string {
    return this.selectedFile?.split('.').slice(0, -1).join('.') || '';
  }

  moveToLockbox(fileId: number) {
    const token = localStorage.getItem('token');
    this.http.post(`https://127.0.0.1:8000/api/lockbox/move/${fileId}/`, {}, {
      headers: new HttpHeaders({ 'Authorization': `Token ${token}` }),
    }).subscribe(() => {
      alert('File moved to Lock Box!');
      this.fetchFilesAndFolders();
    });
  }
  
}




