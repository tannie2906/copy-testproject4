import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { UserFile } from '../models/user-file.model';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service'; 

export interface File {
  id: number;
  filename: string; 
  size: number;
  type?: string; // Optional if not provided
  upload_date: string;
  path: string;
}

@Injectable({
  providedIn: 'root',
})

export class FileService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // Base URL for the API
  folderFiles: File[] = [];
  
  constructor(private http: HttpClient, private authService: AuthService) {}

  // Fetch all user files
  getFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/files/`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching files:', error.message);
        return of([]); // Return an empty array in case of error
      })
    );
  }

  // Correctly typed method to fetch files
  getFolderFiles(): Observable<File[]> {
    return this.http.get<File[]>(`${this.apiUrl}/files/`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching folder files:', error.message);
        return of([]); // Return an empty array on error
      })
    );
  }
  
  // Get the URL for a specific file
  getFileUrl(fileName: string): Observable<{ fileUrl: string }> {
    return this.http.get<{ fileUrl: string }>(`${this.apiUrl}/files/${fileName}`); // Corrected apiUrl
  }  

  // Rename file
  renameFile(fileId: number, newName: string) {
    const url = `http://127.0.0.1:8000/api/rename/`;  // This is your backend URL
    const body = { file_id: fileId, new_name: newName };
  
    return this.http.post(url, body);
  }


  getStarredFiles() {
    return this.http.get<any[]>('http://127.0.0.1:8000/api/files/starred/', {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
    });
  }
  
  toggleStar(fileId: number, isStarred: boolean) {
    return this.http.post(
      `http://127.0.0.1:8000/api/files/toggle-star/${fileId}/`,
      { isStarred },
      {
        headers: { Authorization: `Bearer ${this.authService.getToken()}` },
      }
    );
  } 

  // delete method
  // file.service.ts
deleteFile(fileId: string): Observable<any> {
  const url = `http://127.0.0.1:8000/api/delete/${fileId}/`;
  return this.http.delete(url, {
    headers: {
      Authorization: `Token ${this.authService.getToken()}`,
    },
  }).pipe(
    catchError((error: HttpErrorResponse) => {
      return of(error.error);
    })
  );
}



  // fetch delete file, for delete page
  getDeletedFiles(): Observable<any> {
    return this.http.get('/api/deleted-files'); // Replace with the actual backend API URL
  }

  // File download URL
  getFileDownloadUrl(fileId: number): string {
    return `http://127.0.0.1:8000/api/files/download/${fileId}/`;
  }
}  