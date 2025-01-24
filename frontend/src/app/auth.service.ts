import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';  // Add this import

import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // Ensure this is correct
  private isLoggedIn = false;
  private registerUrl = 'http://127.0.0.1:8000/api/register/';
  private tokenKey = 'auth_token';
  private profileSubject = new BehaviorSubject<any>(null);
  public profile$ = this.profileSubject.asObservable();
  private token: string | null = null; 
  private twoFactorVerified: boolean = false;
  
  constructor(private http: HttpClient) {}

  private getCSRFToken(): string | null {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return csrfToken || null;
  }

  
  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login/`, { username, password }).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.isLoggedIn = true;
          this.token = response.token;
          // Only set the token in localStorage if it's not null
          if (this.token) {
            localStorage.setItem(this.tokenKey, this.token);
          }
        }
      })
    );
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn || localStorage.getItem(this.tokenKey) !== null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey); // Returns string or null
  }

  // Check 2FA verification status
  is2FAVerified(): boolean {
    return this.twoFactorVerified;
  }

  // Update 2FA verification status
  set2FAVerified(status: boolean): void {
    this.twoFactorVerified = status;
  }

  setup2FA(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Token ${token}`,
      'X-CSRFToken': this.getCSRFToken() || '',
    });

    return this.http.post(`${this.apiUrl}/setup-2fa/`, {}, { headers });
  }

  verifyOtp(otpCode: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      console.error('Token not found!');
      return throwError('Token is required');
    }
  
    const headers = new HttpHeaders({
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    });
  
    console.log('Sending OTP payload:', { otp: otpCode });
  
    return this.http.post(`${this.apiUrl}/verify-2fa/`, { otp: otpCode }, { headers }).pipe(
      tap((response: any) => console.log('Verification successful:', response)),
      catchError((error) => {
        console.error('Verification failed:', error);
        return throwError(error);
      })
    );
  }
 
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.isLoggedIn = false;
  }

  // Fetch user profile
  getProfile(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/`, {
      headers: { Authorization: `Token ${token}` },
    }).pipe(
      tap((profile) => {
        this.profileSubject.next(profile); // Update the shared state
      })
    );
  }

  updateProfileState(updatedProfile: any): void {
    this.profileSubject.next(updatedProfile);
  }

  updateProfile(token: string, data: any): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Token ${token}`);
    return this.http.put<any>(`${this.apiUrl}/profile/`, data, { headers });
  }

  getSettings(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Token ${token}`);
    return this.http.get<any>(`${this.apiUrl}/settings/`, { headers });
  }

  updateSettings(token: string, data: any): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Token ${token}`);
    return this.http.put<any>(`${this.apiUrl}/settings/`, data, { headers });
  }

  register(userData: any) {
    return this.http.post(this.registerUrl, userData);
  }

  initializeCSRF(): Observable<any> {
    return this.http.get('http://127.0.0.1:8000/api/password-reset-request', { withCredentials: true });
 }

// Request password reset
requestPasswordReset(email: string): Observable<any> {
  const csrfToken = this.getCSRFToken(); // Fetch CSRF token from cookies
  const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken || '', // Attach CSRF token
  });

  return this.http.post(`${this.apiUrl}/password-reset-request`, { email }, { headers })
      .pipe(catchError((error) => throwError(error)));
}

// Reset password
resetPassword(uid: string, token: string, newPassword: string): Observable<any> {
  const csrfToken = this.getCSRFToken(); // Fetch CSRF token if needed
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken || '',
  });

  return this.http.post(`${this.apiUrl}/password-reset-confirm/${uid}/${token}`, { new_password: newPassword }, { headers })
    .pipe(catchError((error) => throwError(error)));
}
}


