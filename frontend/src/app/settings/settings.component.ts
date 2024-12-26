import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { SettingsService } from '/Users/intan/testproject/frontend/src/app/services/settings.service'; 
import { Router } from '@angular/router';

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
  


  passwordData = {
    old_password: '',
    new_password: '',
    confirm_password: ''
  };

  constructor(private authService: AuthService, private settingsService: SettingsService, private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.authService.getSettings(token).subscribe((data) => {
        this.settings = data;
        this.username = 'CurrentUsername';
      });
    }
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
  

  //saveChanges() {
    //if (this.newPassword !== this.confirmPassword) {
      //alert('Passwords do not match');
      //return;
    //}
  
    // Update username
    //this.settingsService.updateUsername(this.username).subscribe(
      //(response) => {
      //  alert('Username updated successfully');
      //},
      //(error) => {
        //console.error('Error updating username', error);
        //alert('Failed to update username');
      //}
   //);
  
    // Update password
    //if (this.newPassword) {
      //this.settingsService.updatePassword(this.currentPassword, this.newPassword).subscribe(
      //  (response) => {
        //  alert('Password updated successfully');
        //},
        //(error) => {
         // console.error('Error updating password', error);
          //alert('Failed to update password');
        //}
      //);
    //}
  //}  

  //updateSettings() {
    //const token = localStorage.getItem('token');
    //if (token) {
     // this.authService.updateSettings(token, this.settings).subscribe();
    //}
  //}
  //updateUsername(newUsername: string): void {
    //this.settingsService.updateUsername(newUsername).subscribe({
      //next: () => console.log('Username updated successfully'),
      //error: (err) => console.error('Failed to update username', err),
    //});
  //}

  //updateName(firstName: string, lastName: string): void {
    //this.settingsService.updateNameDetails(firstName, lastName).subscribe({
     // next: () => console.log('Name details updated successfully'),
      //error: (err) => console.error('Failed to update name details', err),
    //});
  //}
}
