import { Component, EventEmitter, Output } from '@angular/core';
import { FileService } from '../services/file.service'; // Ensure this service handles file upload
import { AuthService } from '../auth.service'; // Ensure the path to AuthService is correct
import axios, { AxiosError } from 'axios';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFiles: File[] = [];
  fileName: string = ''; // Variable for custom file name

  @Output() fileUploaded = new EventEmitter<void>();

  constructor(private fileService: FileService, private authService: AuthService) {}

  // Handle file selection
  onFileSelected(event: any): void {
    this.selectedFiles = Array.from(event.target.files);
  }

  // Handle file drop
  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
      this.selectedFiles = Array.from(event.dataTransfer.files);
    }
  }

  // Prevent default behavior on drag over
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // Upload files
  async uploadFiles(): Promise<void> {
    if (this.selectedFiles.length === 0) {
      alert('No files selected.');
      return;
    }
  
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const maxSize = 5 * 1024 * 1024; // 5 MB
  
    const token = this.authService.getToken();
    if (!token) {
      alert('You are not authenticated. Please log in first.');
      return;
    }
  
    for (const file of this.selectedFiles) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExt || '')) {
        alert(`Invalid file type: ${file.name}`);
        continue;
      }
  
      if (file.size > maxSize) {
        alert(`File size exceeds limit (5MB): ${file.name}`);
        continue;
      }
  
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', this.fileName);
  
      try {
        const response = await axios.post('http://127.0.0.1:8000/api/upload/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Token ${token}`,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.loaded && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              console.log(`Upload Progress: ${progress}%`);
            }
          },
        });
  
        console.log('Upload successful:', response.data);
        this.fileUploaded.emit();
        alert('File uploaded successfully!');
      } catch (error) {
        console.error('Upload failed:', error);
        alert('File upload failed. Try again.');
      }
    }
  
    this.selectedFiles = [];
    this.fileName = '';
  
  
    } //catch (error: AxiosError<unknown, any>) {
      // Handle errors during the upload
      //const axiosError = error as AxiosError;
      //if (axiosError.response) {
       // console.error('Error uploading file:', axiosError.response.data);
        //if (axiosError.response.status === 403) {
         // alert('You do not have permission to upload files.');
        //} else if (axiosError.response.status === 500) {
         // alert('Server error. Please try again later.');
        //} else {
          //alert('Error uploading file. Please try again.');
        //}
      //} else {
        //console.error('Error uploading file:', axiosError);
       // alert('An unknown error occurred. Please try again.');
      //}
    //}
  }
