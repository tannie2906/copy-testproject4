import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FileService } from '../services/file.service';
import { AuthService } from '../auth.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  canDownload: boolean = false;
  extractedText: any;
  shareToken: string = '';
  enteredPassword: string = ''; 

  constructor(
    private fileService: FileService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer
    
  ) {}

  ngOnInit(): void {
    const fileId = Number(this.route.snapshot.paramMap.get('id')); 
    if (fileId) {
      this.loadFilePreview(fileId);
    } else {
      this.router.navigate(['/']); // Redirect to home if file ID is missing
    }
  }

  loadFilePreview(fileId: number, password: string = ''): void {
    this.fileService.getFileMetadata(fileId).subscribe( // ✅ Pass fileId correctly
      (data) => {
        this.previewUrl = data.url + (password ? `?password=${encodeURIComponent(password)}` : '');
        this.fileType = data.type || 'application/octet-stream';
        this.fileSize = this.formatBytes(data.size);
        this.fileName = data.file_name;
        this.loading = false;
        this.canDownload = data.allow_download; 
      },
      (error) => {
        if (error.status === 401) {
          alert('Password is required to access this file.');
        } else if (error.status === 403) {
          alert('Incorrect password. Please try again.');
        } else {
          console.error('Error loading file preview:', error);
        }
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
  sanitizePdfUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getUserEmail(): string {
    return localStorage.getItem('userEmail') || 'Anonymous User';
  }

  getPreviewUrl(): string {
    const url = new URL(this.previewUrl);
    url.searchParams.append('token', this.getAuthToken());
    return url.toString();
  }
  
}
