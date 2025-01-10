import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module'; // Make sure this is correct
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';  // Correct path
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';  // Import FormsModule for ngModel
import { HttpClientModule } from '@angular/common/http';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { UploadComponent } from './upload/upload.component';
import { FolderComponent } from './folder/folder.component';
import { RouterModule } from '@angular/router';
import { FileListComponent } from './file-list/file-list.component';
import { FileService } from './services/file.service';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TokenInterceptor } from './token.interceptor';
import { DeleteComponent } from './delete/delete.component';
import { FolderService } from './folder.service';
import { SearchComponent } from './search/search.component';
import { FilePreviewComponent } from './file-preview/file-preview.component'; 
import { AuthService } from './auth.service';
import { FormatBytesPipe } from './format-bytes.pipe';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ShareDialogComponent } from './share-dialog/share-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Setup2faComponent } from './setup2fa/setup2fa.component'; //for dialog box
//import { QRCodeModule } from 'angularx-qrcode'
//import { QrCodeComponent } from './qr-code/qr-code.component';  



@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ProfileComponent,
    SettingsComponent,
    RegisterComponent,
    HomeComponent,
    UploadComponent,
    FolderComponent,
    FileListComponent,
    DeleteComponent,
    SearchComponent,
    FilePreviewComponent,
    FormatBytesPipe,
    ShareDialogComponent,
    Setup2faComponent,
    //QrCodeComponent,
    

  ],
  imports: [
    FormsModule,
    ReactiveFormsModule, 
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
   // QRCodeModule,
   
  ],
  providers: [
    FileService,
    FolderService,
    AuthService,
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: TokenInterceptor, 
      multi: true 
    },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule {}
