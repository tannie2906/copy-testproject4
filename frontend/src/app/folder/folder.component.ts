import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { FileService, File } from '../services/file.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFile } from '../models/user-file.model'; 
import axios from 'axios';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.css']
})
export class FolderComponent implements OnInit {
  files: any[] = []; // Array to store file data
  errorMessage: string = ''; // For displaying errors
  folderFiles: File[] = [];
  showStarredFiles: boolean = false; // To toggle between main and starred view
  starredFiles: any[] = []; // Holds starred files
  selectedFileId: number | null = null;
  newFileName: string = '';

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

  isAuthenticated: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private fileService: FileService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Check if the user is authenticated by checking the token in AuthService
    this.isAuthenticated = !!this.authService.getToken();
    this.fetchFiles();          // Loads all files
    this.fetchStarredFiles(); 
    
    if (!this.isAuthenticated) {
      this.errorMessage = 'You are not authenticated. Please log in.';
    }

    // Fetch all files only if authenticated
    if (this.isAuthenticated) {
      this.fetchFiles(); 
    } else {
      this.errorMessage = 'You are not authenticated. Please log in.';
    }
  }

  //fetchFiles(): void {
    //this.fileService.getFolderFiles().subscribe({
      //next: (data) => {
        //console.log('API Response:', data); // Debug to ensure correct data structure
        //this.files = data;
      //},
      //error: (error) => {
        //console.error('Error fetching files:', error);
      //},
    //});
 // }

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
              this.fetchFiles(); // Refresh the file list
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

  // Toggle dropdown visibility for a file
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
  
  // sharing the file
  onShare(file: any): void {
    const emails = prompt('Enter emails to share (comma-separated):');
    const permissions = 'read';  // Example: fixed 'read' permissions
  
    if (emails) {
      const shareWith = emails.split(',').map(email => email.trim());
      this.http.post('http://127.0.0.1:8000/api/files/share/', {
        file_id: file.id,
        share_with: shareWith,
        permissions: permissions
      }).subscribe({
        next: (response: any) => {
          console.log('File shared successfully:', response);
          alert(`Shared Links:\n${response.share_links.map((link: any) => link.share_link).join('\n')}`);
        },
        error: (error) => {
          console.error('Error sharing file:', error);
          alert('Failed to share the file. Please try again.');
        }
      });
    }
  }  

  onMove(_t23: any) {
    throw new Error('Method not implemented.');
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

  onUploadClick(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/upload']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onCreateDocument() {
    throw new Error('Method not implemented.');
  }

  onCreateFolder() {
    throw new Error('Method not implemented.');
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
        this.starredFiles = data;
      },
      error: (error) => {
        console.error('Error fetching starred files:', error);
      }
    });
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

  toggleStarredView(): void {
    this.showStarredFiles = !this.showStarredFiles;
    if (this.showStarredFiles) {
      this.getStarredFiles(); // Updated to use getStarredFiles
    }
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

  //open the file when click
  onOpenFile(file: File, event: Event): void {
    event.preventDefault();  // Prevent default behavior (if it's a link)
  
    const token = this.authService.getToken(); // Retrieve the token from AuthService

    if (!token) {
      alert('You are not authenticated. Please log in.');
      return;
    }

    // Generate the file URL based on file ID
    const fileUrl = `http://127.0.0.1:8000/api/files/view/${file.id}/`;

    // Open the file in a new tab
    window.open(fileUrl, '_blank');
  }

  async fetchFiles() {
    const token = this.authService.getToken();
    const response = await axios.get('http://127.0.0.1:8000/api/files/', {
      headers: { Authorization: `Token ${token}` },
    });
    this.files = response.data;
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
    this.fetchFiles(); // Refresh files
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
    this.fetchFiles();
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

  async shareFile(fileId: number) {
    const token = this.authService.getToken();
    const response = await axios.post(
      `http://127.0.0.1:8000/api/share/${fileId}/`,
      {},
      {
        headers: { Authorization: `Token ${token}` },
      }
    );
    const shareLink = response.data.share_link;
    alert(`Shareable link: ${shareLink}`);
  }

  //file review
  // Helper function to format file size
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Function to preview file metadata
  previewFile(fileId: number): void {
    this.loading = true; // Start loading indicator
    this.fileService.getFileMetadata(fileId).subscribe(
      (data) => {
        this.previewUrl = data.url; // Set preview URL
        this.fileType = data.type || 'application/octet-stream'; // Default MIME type
        this.fileSize = this.formatBytes(data.size); // Format file size
        this.showPreview = true; // Display the preview modal
        this.loading = false; // Stop loading
      },
      (error: HttpErrorResponse) => {
        console.error('Error fetching file preview:', error.message);
        this.loading = false; // Stop loading on error
      }
    );
  }
}