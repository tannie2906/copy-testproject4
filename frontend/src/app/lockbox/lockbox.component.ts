import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-lockbox',
  templateUrl: './lockbox.component.html',
  styleUrls: ['./lockbox.component.css']
})
export class LockboxComponent implements OnInit {
  files: any[] = [];
  passwordEntered = false;
  enteredPassword = '';
  isAuthenticated: boolean = false;
  storedPassword: string | null = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.storedPassword = localStorage.getItem('lockbox_password'); // Retrieve stored password
    if (this.passwordEntered) {
      this.fetchLockedFiles();
    }
  }

  verifyPassword() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Authentication token missing! Please log in.');
      this.router.navigate(['/login']);
      return;
    }
  
    this.http.post(`${environment.apiUrl}/lockbox/verify-password/`, 
      { password: this.enteredPassword }, 
      {
        headers: new HttpHeaders({ 'Authorization': `Token ${token}` }),
      }).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.passwordEntered = true;
            this.fetchLockedFiles();
          } else {
            alert('❌ Incorrect password. Try again.');
          }
        },
        error: () => {
          alert('❌ Incorrect password. Try again.');
          this.enteredPassword = ''; // Clear input
        }
      });
  }
  

  fetchLockedFiles() {
    const token = localStorage.getItem('token');
    this.http.get('https://127.0.0.1:8000/api/lockbox/files/', {
      headers: new HttpHeaders({ 'Authorization': `Token ${token}` }),
    }).subscribe((data: any) => {
      this.files = data;
    });
  }

  moveOut(fileId: number) {
    const token = localStorage.getItem('token');
    this.http.post(`https://127.0.0.1:8000/api/lockbox/remove/${fileId}/`, {}, {
      headers: new HttpHeaders({ 'Authorization': `Token ${token}` }),
    }).subscribe(() => {
      alert('File moved back to folder!');
      this.fetchLockedFiles();
    });
  }

  checkPassword(): void {
    const hashedEnteredPassword = CryptoJS.SHA256(this.enteredPassword).toString();  // ✅ Hash before comparing
  
    if (this.storedPassword && this.storedPassword === hashedEnteredPassword) {
      this.isAuthenticated = true;
    } else {
      alert('❌ Incorrect password. Try again.');
      this.enteredPassword = '';
    }
  }
  
}
