import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, first } from 'rxjs';
import { UserService } from '../services/user/user.service';

@Injectable({ providedIn: 'root' })
export class AdminRoleGuard implements CanActivate {

  constructor(
    private userService: UserService,
    private router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const requiredRole = "admin";

    return this.userService.userWithInitialLoad$().pipe(
      map(user => {
        if (!user) {
          void this.router.navigate(['/error'], { replaceUrl: true });
          return false;
        }

        const actualRole = user.user.role;

        if (actualRole === requiredRole) {
          return true;
        } else {
          void this.router.navigate(['/error'], { replaceUrl: true });
          return false;
        }
      })
    );
  }
}
