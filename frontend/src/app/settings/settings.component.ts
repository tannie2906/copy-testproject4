import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { SettingsService } from '../services/settings.service'; 
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';
import { HttpHeaders, HttpClient  } from '@angular/common/http';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})

export class SettingsComponent implements OnInit {
  settings: any = {};
  username: string = '';             // Initialize with an empty string
  currentPassword: string = '';      // Initialize with an empty string
  newPassword: string = '';          // Initialize with an empty string
  confirmPassword: string = '';
  lockboxPassword: string = '';
  message: string = '';
  selectedTab: string = 'password'; 
  
  passwordData = {
    old_password: '',
    new_password: '',
    confirm_password: ''
  };

  constructor(private authService: AuthService, private settingsService: SettingsService, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.authService.getSettings(token).subscribe((data) => {
        this.settings = data;
        this.username = 'CurrentUsername';
      });
    }
  }

  // Function to switch between tabs
  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  changePassword(): void {
    this.settingsService.changePassword(this.passwordData).subscribe({
      next: (response: any) => { // Explicitly typed as 'any'
        alert(response.message);
      },
      error: (err: any) => { // Explicitly typed as 'any'
        alert(err.error.error || 'Error changing password.');
      },
    });    
  }

  // Delete account function
  deleteAccount(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      this.settingsService.deleteAccount().subscribe({
        next: () => {
          alert('Your account has been deleted successfully.');
          localStorage.removeItem('token'); // Clear authentication token
          this.router.navigate(['/login']); // Redirect to login page
        },
        error: (err: any) => {
          alert(err.error.error || 'Failed to delete account.');
        }
      });
    }
  }
  
  //lockbox
  savePassword() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Authentication token missing! Please log in.');
      return;
    }
  
    this.http.post(`${environment.apiUrl}/lockbox/save-password/`, 
      { password: this.lockboxPassword }, 
      {
        headers: new HttpHeaders({ 'Authorization': `Token ${token}` }),
      }).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.message = '✅ Password saved successfully!';
          } else {
            alert('❌ Failed to save password.');
          }
        },
        error: () => {
          alert('❌ Failed to save password.');
        }
      });
  }  
  
}
