import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private apiUrl = 'http://127.0.0.1:8000/api'; // Your API URL

  constructor(private http: HttpClient, private authService: AuthService) {}

  //getDeletedFiles(userId: string, headers: HttpHeaders): Observable<any[]> {
    //const url = `http://127.0.0.1:8000/api/deleted-files/`; // No additional filters here
    //return this.http.get<any[]>(url, { headers });
  //}  
  getDeletedFiles(userId: string, headers: HttpHeaders): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/deleted-files/`, { headers });
  }
  
  // Delete method updated to use DELETE
  deleteFile(fileId: string): Observable<any> {
  const url = `${this.apiUrl}/delete/${fileId}/`; // Correct endpoint
  return this.http.delete(url, {
    headers: {
      Authorization: `Token ${this.authService.getToken()}`,
    },
  });
  }

  // Restore files service method
  restoreFiles(fileIds: number[]): Observable<any> {
    const url = `${this.apiUrl}/restore-files/`;
  
    const headers = new HttpHeaders()
      .set('Authorization', `Token ${this.authService.getToken() || ''}`)
      .set('Content-Type', 'application/json');
  
    // POST file IDs to restore
    return this.http.post(url, { file_ids: fileIds }, { headers }).pipe(
      tap((response) => {
        console.log('Restore response:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Restore error:', error.message);
        return throwError(error);
      })
    );
  }
  
  

  // Permanently delete a file by ID
 // Permanently delete a single file
permanentlyDeleteFile(fileId: number, headers?: HttpHeaders): Observable<any> {
  const url = `${this.apiUrl}/permanently-delete/${fileId}/`; // Single file URL
  return this.http.delete(url, { headers }).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Permanent delete error:', error);
      return throwError(() => new Error(error.message));
    })
  );
}

// Permanently delete multiple files
permanentlyDeleteMultipleFiles(fileIds: number[], headers?: HttpHeaders): Observable<any> {
  const url = `${this.apiUrl}/permanently-delete/`; // Bulk delete URL
  return this.http.request('delete', url, { body: { file_ids: fileIds }, headers }).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Bulk permanent delete error:', error);
      return throwError(() => new Error(error.message));
    })
  );
}


  // Empty trash
  emptyTrash(headers?: HttpHeaders): Observable<any> {
    const url = `${this.apiUrl}/empty-trash/`; // API endpoint
    return this.http.delete(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Empty Trash Error:', error.message);
        return throwError(() => error); // Handle errors properly
      })
    );
  }
  
  private getCookie(name: string): string {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    return '';
  }
}