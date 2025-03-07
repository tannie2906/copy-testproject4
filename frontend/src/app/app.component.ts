import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';  
import { AuthService } from './auth.service';
import { ApiService } from './services/api.service';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

export interface File {
  id: number;
  user_id: number;
  filename: string; 
  file_name: string;
  size: number;
  type?: string; // Optional if not provided
  upload_date: string;
  path: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
  file_path: string;
  isStarred?: boolean; 
  name: string;
  content?: string;  // content is optional, since it's only available for .txt files
  url: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})

export class AppComponent implements OnInit {
  isAuthenticated: boolean = false;
  title = 'frontend';
  profilePictureUrl: string = '';
  dropdownVisible: boolean = false;
  searchResults: File[] = [];
  query: string = '';
  totalPages: number = 0;
  currentPage: number = 1;
  authSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private apiService: ApiService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.authState$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      
      if (isAuth) {
        this.fetchProfile(); // Fetch profile when logged in
      } else {
        this.resetProfilePicture(); // Reset to default on logout
      }
    });
  
    // Listen to profile updates dynamically
    this.authService.profile$.subscribe(profile => {
      if (profile && profile.picture) {
        this.profilePictureUrl = profile.picture; // Update when profile changes
      }
    });
  
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  fetchProfile(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.authService.getProfile(token).subscribe({
        next: (data) => {
          this.profilePictureUrl = data.picture || 'assets/images/profile.png';
        },
        error: (err) => {
          console.error('Error fetching profile:', err);
        }
      });
    }
  }

  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-section')) {
      this.dropdownVisible = false;
    }
  }
  
  goToLogin() {
    this.router.navigate(['/login']);  // Navigate to the login page
  }

  onLogin(): void {
    this.router.navigate(['/login']);
  }

  onLogout(): void {
    localStorage.removeItem('auth_token'); // clear roken
    this.authService.logout();  // Notify auth service
    this.isAuthenticated = false;  // Immediately update isAuthenticated to false
    this.resetProfilePicture();  // Reset profile image
    this.router.navigate(['/home']);
    this.closeDropdown();
  }

  // Function to reset the profile picture on logout
  resetProfilePicture(): void {
    this.profilePictureUrl = 'assets/images/profile.png';
  }

  checkAuthenticationStatus(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
  }

  goToLockBox(): void {
    if (!this.isAuthenticated) {
      alert("You must log in to access the Lock Box.");
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/lockbox']);
    }
  }
  
  toggleDropdown(): void {
    this.dropdownVisible = !this.dropdownVisible;
  }

  closeDropdown(): void {
    this.dropdownVisible = false;
  }

  onProfileClick(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/profile']);  // Navigate to profile page if authenticated
    } else {
      this.router.navigate(['/login']);    // Navigate to login page if not authenticated
    }
    this.closeDropdown();
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
    this.closeDropdown();
  }
  
  //search bar
  search(): void {
    if (this.query.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.query, page: 1 } });
    }
  }
  
  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // Prevent memory leaks
  }
}  
