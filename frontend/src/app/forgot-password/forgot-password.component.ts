import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  message: string | null = null;

  constructor(private authService: AuthService) {}

  submit(): void {
    this.authService.requestPasswordReset(this.email).subscribe(
      (response) => {
        this.message = 'Password reset email sent successfully.';
      },
      (error) => {
        this.message = 'Error sending password reset email.';
      }
    );
  }

  requestPasswordReset() {
    this.authService.requestPasswordReset(this.email).subscribe(
      (response) => {
        this.message = 'Password reset email sent. Check your inbox!';
      },
      (error) => {
        this.message = 'Error: ' + error.error?.error || 'Something went wrong.';
      }
    );
  }
}