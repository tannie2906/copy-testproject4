import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';  
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { UploadComponent } from './upload/upload.component';
import { RegisterComponent } from './register/register.component';
import { FolderComponent } from './folder/folder.component';
import { DeleteComponent } from './delete/delete.component';
import { AuthGuard } from './auth.guard';
import { SearchComponent } from './search/search.component';
import { FilePreviewComponent } from './file-preview/file-preview.component';
//import { QrCodeComponent } from './qr-code/qr-code.component';
import { Setup2faComponent } from '/Users/intan/testproject/frontend/src/app/setup2fa/setup2fa.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' }, // Redirect to home page
  { path: 'home', component: HomeComponent }, // Home component for main page
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },  // Protected route
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'register', component: RegisterComponent },
  { path: 'upload', component: UploadComponent, canActivate: [AuthGuard] },
  { path: 'folder', component: FolderComponent, canActivate: [AuthGuard] },
  { path: 'search', component: SearchComponent },
  { path: 'delete', component: DeleteComponent, canActivate: [AuthGuard] }, // Add this route
  // { path: '', redirectTo: '/login', pathMatch: 'full' },  // Redirect to login by default
  { path: 'file-preview/:id', component: FilePreviewComponent },
  { path: '', component: FolderComponent }, 
  { path: 'setup-2fa', component: Setup2faComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
