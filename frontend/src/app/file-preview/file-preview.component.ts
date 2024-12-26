import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../services/file.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-file-preview',
  templateUrl: './file-preview.component.html',
  styleUrls: ['./file-preview.component.css']
})
export class FilePreviewComponent implements OnInit {
  fileType: string = '';
  fileSize: string = '';
  previewUrl: string = '';
  fileName: string = '';
  loading: boolean = true; // Loading indicator

  constructor(
    private fileService: FileService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
    
  ) {}

  ngOnInit(): void {
    const fileId = Number(this.route.snapshot.paramMap.get('id'));
    if (fileId) {
      this.loadFilePreview(fileId);
    } else {
      this.router.navigate(['/']); // Redirect to home if file ID is missing
    }
  }

  loadFilePreview(fileId: number): void {
    this.fileService.getFileMetadata(fileId).subscribe(
      (data) => {
        this.previewUrl = data.url;
        this.fileType = data.type || 'application/octet-stream';
        this.fileSize = this.formatBytes(data.size);
        this.fileName = data.file_name;
        this.loading = false; // Stop loading
      },
      (error) => {
        console.error('Error loading file preview:', error);
        this.loading = false;
      }
    );
  }

  // Format file size
  formatBytes(bytes: number, decimals = 2): string {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Add a method to get the token
  getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }
}
