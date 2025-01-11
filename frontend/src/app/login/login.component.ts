// src/app/components/login/login.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  email: string = '';
  otp: string = '';
  otpSent: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.initializeCSRF().subscribe({
        next: () => console.log('CSRF token initialized'),
        error: (error) => console.error('Failed to initialize CSRF', error),
    });
}

  login() {
    this.authService.login(this.username, this.password).subscribe(
      (response) => {
        // Save the token in local storage
        localStorage.setItem('token', response.token);
        // Redirect to the home page on successful login

        // Login successful
       // this.router.navigate(['/setup-2fa']); // Redirect to 2FA setup
        this.router.navigate(['/setup-2fa']);
      },
      (error) => {
        alert('Login failed'); // Show an error message if login fails
      }
    );
  }
}
