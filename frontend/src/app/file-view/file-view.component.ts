import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FolderService } from '../folder.service';  // Import your file service
import { FileService } from '../services/file.service';
import { File } from '../services/file.service';

@Component({
  selector: 'app-file-view',
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.css']
})
export class FileViewComponent implements OnInit {
  file: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    const fileId = this.route.snapshot.paramMap.get('file_id');
    if (fileId) {
      this.loadFile(fileId);
    }
  }
  
  loadFile(fileId: string): void {
    this.fileService.getFileById(fileId).subscribe(
      (file) => {
        console.log('File data:', file);  // Debugging line
        this.file = file;
      },
      (error) => {
        console.error('Error loading file', error);  // More detailed error logging
      }
    );
  }
}