import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const expectedRole = route.data['role'];
    const expectedRoles: string[] = route.data['roles'] || (expectedRole ? [expectedRole] : []);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!this.authService.isLoggedIn || (expectedRoles.length > 0 && !expectedRoles.includes(user.role))) {
      this.router.navigate(['/auth/login']);
      return false;
    }
    return true;
  }
}
