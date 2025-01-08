import { Component } from '@angular/core';

@Component({
  selector: 'app-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.css']
})
export class AppComponent {
  qrData: string = 'https://www.example.com'; 
}
