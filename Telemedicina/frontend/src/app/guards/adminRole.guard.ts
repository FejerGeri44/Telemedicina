import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, first, filter } from 'rxjs';
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

    return this.userService.user$().pipe(
      filter(user => !!user),
      first(),
      map(user => {
        const actualRole = user.user.role;

        if (actualRole === requiredRole) {
          return true;
        } else {
          void this.router.navigate(['/error']);
          return false;
        }
      })
    );
  }
}
