import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OtpService {
    private baseUrl = 'http://127.0.0.1:8000'; // Django backend URL

    constructor(private http: HttpClient) {}

    sendOtp(email: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/send-otp/`, { email });
    }

    verifyOtp(otp: string): Observable<any> {
        return this.http.post(`${this.baseUrl}/verify-otp/`, { otp });
    }
}
