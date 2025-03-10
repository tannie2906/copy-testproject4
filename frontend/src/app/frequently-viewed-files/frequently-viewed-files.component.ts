import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-frequently-viewed-files',
  templateUrl: './frequently-viewed-files.component.html',
  styleUrls: ['./frequently-viewed-files.component.css']
})
export class FrequentlyViewedFilesComponent implements OnInit {
  frequentlyViewedFiles: any[] = [];  // This will hold the data from the API

  constructor(private http: HttpClient, private route: ActivatedRoute, private authService: AuthService, private router: Router,) { }

  ngOnInit(): void {
    this.fetchFrequentlyViewedFiles();
  }

  // Fetch frequently viewed files from the backend
  fetchFrequentlyViewedFiles(): void {
    this.http.get<any[]>(`${environment.apiUrl}/files/frequently-viewed/`)
      .subscribe(
        (response) => {
          console.log("API Response:", response);
          this.frequentlyViewedFiles = response;
        },
        (error) => {
          console.error('Error fetching frequently viewed files:', error);
        }
      );
    }
  
    async onOpenFile(file: any): Promise<void> {
      console.log("Clicked file:", file); // Check if file is being passed correctly
      if (!file || !file.id) {
        console.error("❌ File ID is missing. Cannot navigate.", file);
        return;
      }
    
      try {
        await this.trackFileView(file.id).toPromise();
        console.log("File view tracked successfully");
        this.router.navigate([`/files/view/${file.id}`]);
      } catch (error) {
        console.error("Error tracking file view:", error);
        // Even if tracking fails, navigate to the file
        this.router.navigate([`/files/view/${file.id}`]);
      }
    }
    
  
    trackFileView(fileId: number) {
      const token = this.authService.getToken();
      return this.http.post(`${environment.apiUrl}/files/view/${fileId}/track/`, {}, {
        headers: { Authorization: `Token ${token}` }
      });
    }
  }
