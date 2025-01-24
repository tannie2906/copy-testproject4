import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { FileService, File } from '../services/file.service';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFile } from '../models/user-file.model';
import { AuthService } from '../auth.service';
import axios from 'axios';
import { ShareDialogComponent } from '../share-dialog/share-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  query: string = '';
  searchResults: any[] = [];
  totalPages: number = 0;
  currentPage: number = 1;
  sortOrder: { [key: string]: string } = { name: 'asc' };
  files: any[] = [];
  searchService: any;
  searchQuery: any;
  currentFolderId: string | null = null;
  shareEmail = '';
  sharePermissions: string | undefined = '';  

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router, 
    private fileService: FileService,
    private http: HttpClient,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Get query and page number from URL parameters
    this.route.queryParams.subscribe((params) => {
      this.query = params['q'] || '';
      this.currentPage = +params['page'] || 1;
      if (this.query) {
        this.fetchSearchResults(this.query, this.currentPage);
      }
    });
  }

  // Fetch search results
  fetchSearchResults(query: string, page: number): void {
    this.apiService.getSearchResults(query, page).subscribe(
      (response: any) => {
        this.searchResults = response.results || []; // Paginated data
        this.totalPages = Math.ceil(response.count / 10); // Calculate total pages based on page size
        this.currentPage = page;
      },
      (error: any) => {
        console.error('Search error:', error);
        this.searchResults = [];
      }
    );
  }

  // Pagination: Go to the next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.navigateToPage(this.currentPage + 1);
    }
  }

  // Pagination: Go to the previous page
  prevPage(): void {
    if (this.currentPage > 1) {
      this.navigateToPage(this.currentPage - 1);
    }
  }

  // Navigate to a specific page
  navigateToPage(page: number): void {
    this.router.navigate(['/search'], {
      queryParams: { q: this.query, page: page },
    });
  }

  // Sort files by specified field
  sortFiles(field: string): void {
    const currentOrder = this.sortOrder[field];
    this.sortOrder[field] = currentOrder === 'asc' ? 'desc' : 'asc';

    this.searchResults.sort((a: any, b: any) => {
      if (this.sortOrder[field] === 'asc') {
        return a[field] > b[field] ? 1 : -1;
      } else {
        return a[field] < b[field] ? 1 : -1;
      }
    });
  }

  // Open file action
  onOpenFile(file: any): void {
    this.router.navigate([`/files/view/${file.id}`]);
  }

  

  // Toggle starred files
  toggleStar(file: any): void {
    file.isStarred = !file.isStarred;
    console.log('Star toggled:', file);
  }

  // ====== NEW METHODS ADDED ======

  // Format file size
  formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    else if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
    else if (size < 1073741824) return `${(size / 1048576).toFixed(1)} MB`;
    else return `${(size / 1073741824).toFixed(1)} GB`;
  }

  // Handle actions for dropdown menu
  toggleDropdown(file: any): void {
    file.showDropdown = !file.showDropdown;
  }

  onRename(file: any): void {
    const newName = prompt('Enter a new name for the file:', file.name);
  
    if (!newName || newName.trim() === '') {
      alert('File name cannot be empty.');
      return;
    }
  
    this.fileService.renameFile(file.id, newName).subscribe({
      next: () => {
        file.name = newName; // Update the name in the UI
        alert('File renamed successfully!');
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error renaming file:', error);
        alert(error.error?.error || 'Failed to rename the file.');
      },
    });
  }
  

  refreshSearchResults() {
    // Assume the search query is available in the component
    const searchQuery = this.searchQuery; // Get the current search query
    const page = this.currentPage; // Get the current page number
  
    // Re-fetch the search results
    this.searchService.search(searchQuery, page).subscribe({
      next: (response: { results: any[]; }) => {
        this.searchResults = response.results; // Update the UI with the latest search results
      },
      error: (error: any) => {
        console.error('Error fetching search results:', error);
      },
    });
  }
  

  onShare(file: any): void {
    console.log('File passed to onShare:', file); // Debugging
    if (!file.id) {
      alert('File ID is missing.');
      return;
    }
  
    const dialogRef = this.dialog.open(ShareDialogComponent, {
      width: '400px',
      data: { fileId: file.id },
    });
  
    dialogRef.afterClosed().subscribe((email) => {
      if (email) {
        this.fileService.shareFile(file.id, email).subscribe({
          next: () => {
            alert(`File shared successfully with ${email}`);
          },
          error: (error) => {
            console.error('Error sharing file:', error);
            alert('Failed to share the file.');
          },
        });
      }
    });
  }

  onDownload(file: any, event: Event): void {
    event.preventDefault();
  
    const token = this.authService.getToken();
    if (!token) {
      alert('You are not authenticated. Please log in.');
      return;
    }
  
    // Ensure file.id is correctly passed
    if (!file.id) {
      console.error('File ID is missing in the search results:', file);
      alert('Unable to download the file. File ID is missing.');
      return;
    }
  
    this.fileService.downloadFile(file.id, token).subscribe({
      next: (blob) => {
        // Create a URL for the downloaded file
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
  
        // Use the file_name if provided
        a.download = file.file_name || `file-${file.id}`;
        a.click();
  
        // Clean up the URL object
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
  
        // Debugging
        console.error('File object causing error:', file);
  
        alert('Failed to download the file. Please try again.');
      },
    });
  }
  

  onDelete(file: any, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
  
    if (confirm('Are you sure you want to delete this file?')) {
      this.fileService.deleteFile(file.id).subscribe({
        next: () => {
          alert('File deleted successfully.');
          // Remove file from UI
          this.searchResults = this.searchResults.filter((f) => f.id !== file.id);
        },
        error: (error) => {
          console.error('Error deleting file:', error);
          alert('Failed to delete the file.');
        },
      });
    }
  }

}
