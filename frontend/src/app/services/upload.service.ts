import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
    private uploadUrl = 'http://localhost:8000/api/upload/'; 

  constructor(private http: HttpClient) {}

  uploadFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file, file.name);  // Append each file to FormData
    });

    // POST request to upload files
    return this.http.post(this.uploadUrl, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'events',
    });
  }
}