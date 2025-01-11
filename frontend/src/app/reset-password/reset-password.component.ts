import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  newPassword: string = '';
  token: string | null = null;
  message: string | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const fullUrl = window.location.href;
    console.log('Full URL:', fullUrl);  // Log the entire URL
    this.token = this.route.snapshot.paramMap.get('token');
    console.log('Extracted token:', this.token);  // Log the extracted token
  }

  submit(): void {
    if (!this.token) {
      this.message = 'Invalid or missing token.';
      return;
    }
  
    console.log('Token before sending request:', this.token);  // Add this line for debugging
  
    this.authService.resetPassword(this.token, this.newPassword).subscribe(
      (response) => {
        this.message = 'Password reset successfully!';
        setTimeout(() => this.router.navigate(['/login']), 2000); // Redirect after success
      },
      (error) => {
        this.message = 'Error resetting password.';
      }
    );
  }

  

  resetPassword() {
    if (this.token) {
      this.authService.resetPassword(this.token, this.newPassword).subscribe(
        (response) => {
          this.message = 'Password reset successfully. You can now log in.';
        },
        (error) => {
          this.message = 'Error: ' + error.error?.error || 'Something went wrong.';
        }
      );
    }
  }
}
