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
  uid: string | null = null;  // Add UID
  message: string | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    this.uid = this.route.snapshot.paramMap.get('uid');

    console.log('UID:', this.uid);  // Debug log to check the UID
    console.log('Token:', this.token);  // Debug log to check the token
}

  submit(): void {
    if (!this.token || !this.uid) {
      this.message = 'Invalid or missing token.';
      return;
    }

    console.log('Token before sending request:', this.token);  // Add this line for debugging
    console.log('UID before sending request:', this.uid);  // Add this line for debugging

    this.authService.resetPassword(this.uid, this.token, this.newPassword).subscribe(
      (response) => {
        this.message = 'Password reset successfully!';
        setTimeout(() => this.router.navigate(['/login']), 2000); // Redirect after success
      },
      (error) => {
        this.message = 'Error resetting password.';
        console.log(error);  // Log error to inspect the problem
      }
    );
  }
}