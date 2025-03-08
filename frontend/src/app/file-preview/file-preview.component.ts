import { Component, OnInit, HostListener, ElementRef, Renderer2 } from '@angular/core';
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
  isMac: boolean = false;
  watermarkText: string = '';

  constructor(
    private fileService: FileService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private el: ElementRef,
    private renderer: Renderer2
    
  ) {}

  ngOnInit(): void {
    const fileId = Number(this.route.snapshot.paramMap.get('id')); 
    if (fileId) {
      this.loadFilePreview(fileId);
    } else {
      this.router.navigate(['/']); // Redirect to home if file ID is missing
    }
  
    // ✅ Detect Mac System
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
    // ✅ Apply Screenshot Prevention & Watermark
    this.disableScreenshot();
    this.addDynamicWatermark();
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

  getDownloadUrl(): string {
    let url = new URL(this.previewUrl);
    url.searchParams.append('token', this.getAuthToken()); // Ensure authentication token is included
    return url.toString();
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

  // Prevent Right Click
  @HostListener('contextmenu', ['$event'])
  disableRightClick(event: MouseEvent) {
    event.preventDefault();
  }

  // Detect Print Screen Key (For Windows)
  @HostListener('window:keyup', ['$event'])
  preventPrintScreen(event: KeyboardEvent) {
    if (event.key === 'PrintScreen') {
      alert('Screenshoting is disabled!');
      navigator.clipboard.writeText(''); // Clear Clipboard
    }
  }

  // Prevent Screenshot on Mac 
  @HostListener('window:keydown', ['$event'])
preventMacScreenshot(event: KeyboardEvent) {
  if (this.isMac && event.metaKey && event.shiftKey && (event.key === '4' || event.key === '5')) {
    event.preventDefault();
    alert('Screenshots are disabled for this file!');
  }
}

  // 🔹 Blur Content When Focus is Lost (For External Screenshot Apps)
  @HostListener('window:blur', ['$event'])
onWindowBlur() {
  const overlay = document.createElement('div');
  overlay.setAttribute('id', 'blurOverlay');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.zIndex = '9999';
  document.body.appendChild(overlay);
}

@HostListener('window:focus', ['$event'])
onWindowFocus() {
  const overlay = document.getElementById('blurOverlay');
  if (overlay) {
    overlay.remove();
  }
}

  // Watermark the File Preview with User Email
  addWatermark() {
    const userEmail = this.getUserEmail();
    
    const watermarkDiv = this.renderer.createElement('div');
    this.renderer.setStyle(watermarkDiv, 'position', 'fixed');
    this.renderer.setStyle(watermarkDiv, 'top', '50%');
    this.renderer.setStyle(watermarkDiv, 'left', '50%');
    this.renderer.setStyle(watermarkDiv, 'transform', 'translate(-50%, -50%)');
    this.renderer.setStyle(watermarkDiv, 'color', 'rgba(255, 255, 255, 0.3)');
    this.renderer.setStyle(watermarkDiv, 'fontSize', '30px');
    this.renderer.setStyle(watermarkDiv, 'pointerEvents', 'none');  // Prevent clicks
    this.renderer.setStyle(watermarkDiv, 'zIndex', '99999');
    this.renderer.setStyle(watermarkDiv, 'whiteSpace', 'nowrap');
    this.renderer.setStyle(watermarkDiv, 'userSelect', 'none');
    this.renderer.setStyle(watermarkDiv, 'mix-blend-mode', 'difference'); // Makes it harder to edit out
    this.renderer.setProperty(watermarkDiv, 'innerText', `Confidential - ${userEmail}`);
  
    this.renderer.appendChild(document.body, watermarkDiv);
  }
  addDynamicWatermark() {
    const userEmail = this.getUserEmail();
    
    const watermarkDiv = this.renderer.createElement('div');
    this.renderer.setStyle(watermarkDiv, 'position', 'fixed');
    this.renderer.setStyle(watermarkDiv, 'color', 'rgba(255, 255, 255, 0.3)');
    this.renderer.setStyle(watermarkDiv, 'fontSize', '20px');
    this.renderer.setStyle(watermarkDiv, 'pointerEvents', 'none');
    this.renderer.setStyle(watermarkDiv, 'zIndex', '99999');
    this.renderer.setStyle(watermarkDiv, 'userSelect', 'none');
    this.renderer.setStyle(watermarkDiv, 'mix-blend-mode', 'difference');
    this.renderer.setProperty(watermarkDiv, 'innerText', `Confidential - ${userEmail}`);
  
    this.renderer.appendChild(document.body, watermarkDiv);
  
    // Function to update position randomly
    const updatePosition = () => {
      const x = Math.floor(Math.random() * (window.innerWidth - 200));
      const y = Math.floor(Math.random() * (window.innerHeight - 50));
      this.renderer.setStyle(watermarkDiv, 'left', `${x}px`);
      this.renderer.setStyle(watermarkDiv, 'top', `${y}px`);
    };
  
    // Move watermark every 3 seconds
    updatePosition();
    setInterval(updatePosition, 3000);
  }
  disableScreenshot() {
    const style = document.createElement('style');
    style.innerHTML = `
      body::after {
        content: "Confidential - " attr(data-user);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        color: rgba(255, 255, 255, 0.1);
        font-size: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        user-select: none;
        z-index: 9999;
        mix-blend-mode: overlay;
      }
    `;
    document.body.setAttribute("data-user", `Confidential - ${this.getUserEmail()}`);
    document.head.appendChild(style);
  }
}