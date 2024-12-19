import { Component, OnInit } from '@angular/core';
import { FileService } from '../services/file.service';

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {

  files: any[] = [];

  constructor(private fileService: FileService) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.fileService.getFiles().subscribe(
      (data) => {
        this.files = data;
      },
      (error) => {
        console.error('Error loading files:', error);
      }
    );
  }
  
  deleteFile(id: number) {
    if (confirm('Are you sure you want to delete this file?')) {
      this.fileService.deleteFile(id).subscribe({
        next: () => {
          this.files = this.files.filter((file) => file.id !== id);
          alert('File deleted successfully');
        },
        error: (err) => {
          console.error(err);
          alert('Error deleting file');
        },
      });
    }
  }
}