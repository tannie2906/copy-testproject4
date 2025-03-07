import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  profile: any = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    picture: null,
  };
  defaultProfilePicture = 'assets/images/profile.png'; // Placeholder image path
  selectedFile: File | null = null; // For file upload
  isEditing = false; // Toggle for edit mode

  constructor(private settingsService: SettingsService, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.profile$.subscribe((data) => {
      if (data) {
        this.profile = data;
  
        // Ensure 'profile_picture' exists and append base URL if it's relative
        if (this.profile.profile_picture) {
          this.profile.picture = this.profile.profile_picture.startsWith('http')
            ? this.profile.profile_picture
            : `https://127.0.0.1:8000${this.profile.profile_picture}`;
        } else {
          this.profile.picture = this.defaultProfilePicture;
        }
  
        console.log('Profile data:', this.profile);
      } else {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Fetch profile from backend if not already available
          this.authService.getProfile(token).subscribe({
            next: (profileData) => {
              this.profile = profileData;
  
              // Handle profile picture if it exists
              if (this.profile.profile_picture) {
                this.profile.picture = this.profile.profile_picture.startsWith('http')
                  ? this.profile.profile_picture
                  : `https://127.0.0.1:8000${this.profile.profile_picture}`;
              } else {
                this.profile.picture = this.defaultProfilePicture;
              }
  
              console.log('Fetched Profile data:', this.profile);
            },
            error: (err) => {
              console.error('Error fetching profile:', err);
            }
          });
        }
      }
    });
  }
  

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  saveChanges(): void {
    const updatedProfile = { ...this.profile };
  
    // Update username, first name, and last name
    this.settingsService.updateProfile(updatedProfile).subscribe({
      next: () => {
        console.log('Profile updated successfully!');
        this.loadProfile();
        this.isEditing = false;
      },
      error: (err) => {
        console.error('Error updating profile:', err);
      },
    });
  
    // Upload profile picture if a new file is selected
    if (this.selectedFile) {
      // Create FormData object for the file
      const formData = new FormData();
      formData.append('file', this.selectedFile);
  
      this.settingsService.uploadProfilePicture(formData).subscribe({
        next: (response: any) => {
          console.log('Profile picture updated successfully!');

          // Update profile picture in AuthService to notify AppComponent
          this.authService.updateProfilePicture(response.profile_picture_url);

          this.profile.picture = response.profile_picture_url;
          this.selectedFile = null;
        },
        error: (err) => {
          console.error('Error uploading profile picture:', err);
        },
      });
      
    }
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
  }

  loadProfile(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authService.getProfile(token).subscribe({
        next: (data) => {
          this.profile = data;
        },
        error: (err) => {
          console.error('Error fetching profile:', err);
        },
      });
    }
  }
}
