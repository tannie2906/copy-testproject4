import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { FileService } from '../services/file.service';
import { HttpClient } from '@angular/common/http';
import { UserFile } from '../models/user-file.model'; 

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})

export class HomeComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  userFiles: UserFile[] = [];
  isAuthenticated: boolean = false;
  is2FAVerified: boolean = false; 

  constructor(
    private authService: AuthService,
    private router: Router,
    private fileService: FileService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.isAuthenticated = true;
      this.is2FAVerified = this.authService.is2FAVerified();
    }
  }

  onGetStartedClick(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/upload']);
    } else {
      this.router.navigate(['/login']);
    }
  }


  onFileUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      this.http.post('/api/upload', formData).subscribe(() => {
        console.log('File uploaded successfully');
      });
    }
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click(); // Programmatically click the file input
  }  

  goToFrequentlyVisited(): void {
    if (this.isAuthenticated && this.is2FAVerified) {
      this.router.navigate(['/files/frequently-viewed']);
    } else {
      alert("You must be logged in and have 2FA enabled to access frequently viewed files.");
    }
  }
}
