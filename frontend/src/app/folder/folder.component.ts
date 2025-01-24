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
  apiUrl: string = 'http://127.0.0.1:8000/api';
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
    this.isAuthenticated = !!this.authService.getToken();
    if (!this.isAuthenticated) {
      this.errorMessage = 'You are not authenticated. Please log in.';
      return;
    }
    this.fetchFilesAndFolders();
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
    file.showDropdown = !file.showDropdown;
  }

  // Utility to format the file size to a readable format
  formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1048576) return `${(size / 1024).toFixed(2)} KB`;
    if (size < 1073741824) return `${(size / 1048576).toFixed(2)} MB`;
    return `${(size / 1073741824).toFixed(2)} GB`;
  }

  // File download functionality
  onDownload(file: UserFile, event: Event): void {
    event.preventDefault();
  
    const token = this.authService.getToken();
    if (!token) {
      alert('You are not authenticated. Please log in.');
      return;
    }
  
    console.log('Downloading file:', file.file_name); // Debug log
  
    this.fileService.downloadFile(file.id, token).subscribe({
      next: (blob) => {
        console.log('File downloaded successfully:', blob);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.file_name || 'downloaded_file'; // Use correct filename
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
        alert('Failed to download the file. Please try again.');
      },
    });
  }  

  onRename(file: any): void {
    const newName = prompt('Enter a new name for the file:', file.filename);
  
    // Validate input
    if (!newName || newName.trim() === '') {
      alert('File name cannot be empty.');
      return;
    }
  
    // Perform rename operation
    this.fileService.renameFile(file.id, newName).subscribe({
      next: (response) => {
        file.filename = newName; // Update UI
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

  // Trigger file input click for folders
  onFolderUploadClick(): void {
    this.folderInput.nativeElement.click();
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

  // Handle folder upload
  onUploadFolder(event: any) {
    const files = event.target.files;
    const formData = new FormData();

    // Loop through each file and add it with its relative path (for folders)
    for (let file of files) {
      formData.append('files', file, file.webkitRelativePath);
    }

    // Upload the files, passing true to indicate folder upload
    this.uploadFiles(formData, true);
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
        file.isStarred = previousState; // Revert on failure
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

  //open folder
  onOpenFolder(folderId: string) {
    this.currentFolderId = folderId;
    // Fetch files and subfolders within the folder (if necessary)
    this.http.get(`http://localhost:8000/api/folder/${folderId}/`).subscribe((response: any) => {
      this.files = response.files;
    });
  }
  
  loadFolderContents(folderId: number): void {
    this.fileService.getFolderContents(folderId).subscribe({
      next: (data) => {
        this.files = [
          ...data.folders.map((folder: any) => ({ ...folder, type: 'folder' })),
          ...data.files.map((file: any) => ({ ...file, type: 'file' })),

        ];
      },
      error: (error) => console.error('Failed to load folder contents', error),
    });
  }
  

  async fetchFilesAndFolders() {
    const token = this.authService.getToken();
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/folders/', {
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
    const newFileName = window.prompt('Enter new file name:', '');
  
    // Validate input
    if (!newFileName || newFileName.trim() === '') {
      alert('File name cannot be empty!');
      return; // Stop if name is invalid
    }
  
    const payload = { name: newFileName.trim() }; // Trimmed input
  
    console.log('Sending payload:', payload); // Debug payload
  
    // Send request
    await axios.post(
      `http://127.0.0.1:8000/api/rename/${fileId}/`,
      payload,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json', // Ensure JSON format
        },
      }
    );
  
    alert('File renamed successfully!');
    this.fetchFilesAndFolders(); // Refresh files
  }
  
  async deleteFile(fileId: number) {
    const token = this.authService.getToken();
    await axios.post(
      `http://127.0.0.1:8000/api/delete/${fileId}/`,
      {},
      {
        headers: { Authorization: `Token ${token}` },
      }
    );
    alert('File moved to trash.');
    this.fetchFilesAndFolders();
  }

  async downloadFile(fileId: number) {
    const token = this.authService.getToken();
    const response = await axios.get(
      `http://127.0.0.1:8000/api/download/${fileId}/`,
      {
        headers: { Authorization: `Token ${token}` },
        responseType: 'blob', // Download as binary data
      }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'file'); // Dynamic name can be set here
    document.body.appendChild(link);
    link.click();
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
}




