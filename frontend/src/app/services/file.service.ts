import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';
import { UserFile } from '../models/user-file.model';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service'; 
import { environment } from 'src/environments/environment';

export interface File {
  webkitRelativePath: any;
  id: number;
  user_id: number;
  filename: string; 
  file_name: string;
  size: number;
  type?: string; 
  upload_date: string;
  path: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
  file_path: string;
  modified: string;
  isStarred?: boolean; 
  name: string;
  content?: string;  // content is optional, since it's only available for .txt files
  url: string;

}

@Injectable({
  providedIn: 'root',
})

export class FileService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // Base URL for the API
  folderFiles: File[] = [];
  
  constructor(private http: HttpClient, private authService: AuthService) {}

  // Utility: Get authorization headers
  private getHeaders() {
    return {
      headers: {
        Authorization: `Token ${this.authService.getToken()}`,
      },
    };
  }

  // Error handling utility
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T); // Return default result on error
    };
  }

  // Fetch all user files
  getFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/files/`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching files:', error.message);
        return of([]); // Return an empty array in case of error
      })
    );
  }

  // Fetch all folders
  getFolderFiles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/folders/`, this.getHeaders()).pipe(
      catchError(this.handleError('getFolderFiles', []))
    );
  }

  // Rename file
  renameFile(fileId: number, newName: string) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Token ${token}` });
    return this.http.post(`${this.apiUrl}/rename/${fileId}/`, { name: newName }, { headers });
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
  
  // Get URL for a specific file
  getFileUrl(fileName: string): Observable<{ fileUrl: string }> {
    return this.http.get<{ fileUrl: string }>(`${this.apiUrl}/files/${fileName}`, this.getHeaders());
  }  

  // delete method 
  deleteFile(fileId: number, isDeleted: boolean = false): Observable<any> {
    const endpoint = isDeleted ? 'delete/permanent' : 'delete'; // Endpoint fix
    const url = `${this.apiUrl}/${endpoint}/${fileId}/`;

    return this.http.post(url, {}, this.getHeaders()).pipe( // Use POST here!
        tap(() => console.log(`File ${isDeleted ? 'permanently' : 'temporarily'} deleted: ID ${fileId}`)),
        catchError(this.handleError('deleteFile'))
    );
  }

  // Fetch deleted files
  getDeletedFiles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deleted-files/`, this.getHeaders()).pipe(
      catchError(this.handleError('getDeletedFiles', []))
    );
  }

  // File download URL
  getFileDownloadUrl(fileId: number): string {
    return `${this.apiUrl}/download/${fileId}/`;
  }
  
  // Ensure download uses the correct filename
  downloadFile(fileId: number, token: string) {
    const url = this.getFileDownloadUrl(fileId);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  
    return this.http.get(url, {
      headers: headers,
      responseType: 'blob',
    });
  }

  // Example method to search files
  searchFiles(searchTerm: string, page: number) {
    const searchUrl = `${environment.apiUrl}/apisearch/?search=${searchTerm}&page=${page}`;

    return this.http.get(searchUrl);
  }

  //folder review
  getFileMetadata(fileId: number): Observable<any> {
    const url = `${this.apiUrl}/file-metadata/${fileId}/`;
    return this.http.get(url).pipe(
      catchError((error) => {
        console.error('Error fetching file metadata:', error.message);
        return throwError(() => error);
      })
    );
  }

  getFolderContents(folderId: number): Observable<any> {
    const token = this.authService.getToken();
    return this.http.get<any>(`${this.apiUrl}/folders/${folderId}/`, {
      headers: { Authorization: `Token ${token}` },
    });
  }

  // Create Folder
createFolder(folderData: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/folders/`, folderData, this.getHeaders());
} 

  //share file
  shareFile(fileId: number, email: string): Observable<any> {
    const csrfToken = this.getCsrfToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    });

    const url = `${this.apiUrl}/share-file/${fileId}/`; // Updated endpoint
    const payload = { email };

    return this.http.post(url, payload, { headers }).pipe(
      catchError((error) => {
        console.error('Error sharing file:', error.message);
        return throwError(() => error);
      })
    );
  }

  private getCsrfToken(): string {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
    return '';
  }

  getFileById(fileId: string): Observable<any> {
    return this.http.get(`http://localhost:8000/api/files/view/${fileId}/`); // Add /api/ prefix
}
}