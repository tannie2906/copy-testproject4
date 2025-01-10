import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-setup2fa',
  templateUrl: './setup2fa.component.html',
  styleUrls: ['./setup2fa.component.css']
})
export class Setup2faComponent implements OnInit {
  qrCodeData: string | null = null;
  qrCodeUrl: SafeUrl | null = null;
  otpCode: string = ''; // OTP entered by the user
  verificationMessage: string | null = null; // Message after OTP verification
  verificationSuccess: boolean = false; // Whether OTP verification succeeded

  constructor(private authService: AuthService, private sanitizer: DomSanitizer, private router: Router) {}

 ngOnInit(): void {
    this.authService.setup2FA().subscribe(
      (response: any) => {
        this.qrCodeData = response.qr_code; // Set the QR code data
        console.log('QR Code Data:', this.qrCodeData);
      },
      (error) => {
        console.error('Error setting up 2FA:', error);
      }
    );
  }

  verifyOtp(): void {
    if (!this.otpCode) {
      this.verificationMessage = 'Please enter the OTP.';
      this.verificationSuccess = false;
      return;
    }

    this.authService.verifyOtp(this.otpCode).subscribe(
      (response: any) => {
        this.verificationMessage = '2FA verified successfully!';
        this.verificationSuccess = true;

        // Update 2FA verification status
        this.authService.set2FAVerified(true);

        // Redirect to the homepage
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      (error) => {
        this.verificationMessage =
          error.error?.error || 'Verification failed. Please try again.';
        this.verificationSuccess = false;
      }
    );
  }
}


