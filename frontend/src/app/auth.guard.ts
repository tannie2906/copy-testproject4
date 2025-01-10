import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';  // Assuming you have an AuthService for managing authentication

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  //canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
   // if (this.authService.isAuthenticated()) {
    //  return true; // Allow access if authenticated
   // } else {
    //  this.router.navigate(['/login']);  // Redirect to login if not authenticated
    //  return false;
    //}
//  }
//}

canActivate(): boolean {
  // Check if the user has completed 2FA
  if (!this.authService.is2FAVerified()) {
    // Redirect to the 2FA setup/verification page
    this.router.navigate(['/setup-2fa']);
    return false;
  }
  return true;
}
}
