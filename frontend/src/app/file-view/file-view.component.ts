import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FolderService } from '../folder.service';  // Import your file service
import { FileService } from '../services/file.service';
import { File } from '../services/file.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-file-view',
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.css']
})
export class FileViewComponent implements OnInit {
  //file: File | null = null;
  file: {url: any; name: string; type: string; content: string; tables?: string[][][]; } | undefined;
  

  

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const fileId = this.route.snapshot.paramMap.get('file_id');
    if (fileId) {
      this.loadFile(fileId);
    }
  }

  sanitizePdfUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
  
  loadFile(fileId: string): void {
    this.fileService.getFileById(fileId).subscribe(
      (file) => {
        console.log('File Data:', file);  // Debugging line
        console.log("PDF URL:", this.file?.url);
        
        // Verify URL format
        if (!file.url || !file.url.startsWith("http")) {
          console.error("Invalid PDF URL received:", file.url);
        }
  
        this.file = file;
      },
      (error) => {
        console.error('Error loading file', error);
      }
    );
  }
  
}