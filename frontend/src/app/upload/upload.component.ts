import { Component, EventEmitter, Output } from '@angular/core';
import { FileService } from '../services/file.service'; // Ensure this service handles file upload
import { AuthService } from '../auth.service'; // Ensure the path to AuthService is correct
import axios from 'axios';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFiles: File[] = [];
  fileName: string = ''; // Variable for custom file name
  folderName: string[] = [];

  @Output() fileUploaded = new EventEmitter<void>();

  constructor(private fileService: FileService, private authService: AuthService) {}

  // Handle folder selection
  async onFolderSelected(event: any): Promise<void> {
    const items = event.target.files;
    for (const item of items) {
      const file = item;
      const relativePath = file.webkitRelativePath || file.name;
      this.selectedFiles.push(file);

      // Extract folder hierarchy
      const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
      if (folderPath && !this.folderName.includes(folderPath)) {
        this.folderName.push(folderPath);
      }
    }
    console.log('Detected folders:', this.folderName);
  }

  // Handle file drop
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();

    if (event.dataTransfer?.items) {
      const items = Array.from(event.dataTransfer.items);

      for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isFile) {
          const file = item.getAsFile();
          if (file) this.selectedFiles.push(file);
        }
      }
    }
  }

  async uploadFiles(): Promise<void> {
    if (this.selectedFiles.length === 0 && this.folderName.length === 0) {
      alert('No files or folders selected.');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    const formData = new FormData();

    // Add folders if selected
    for (const folder of this.folderName) {
      formData.append('folders[]', folder);
    }

    // Attach files
    for (const file of this.selectedFiles) {
      const relativePath = file.webkitRelativePath || file.name;
      formData.append('files', file);
      formData.append(`relative_path_${file.name}`, relativePath);
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/upload/', formData, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload successful:', response.data);
      this.fileUploaded.emit();
      alert('Files and folders uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    }

    this.selectedFiles = [];
    this.folderName = [];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // Handle file selection
  onFileSelected(event: any): void {
    this.selectedFiles = Array.from(event.target.files);
  }
}
