// auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import {AuthService} from '../../shared/auth.service';

async function ensureTokenOrRedirect(url: string): Promise<boolean | UrlTree> {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = await auth.getIdToken();
  if (token) return true;

  return router.createUrlTree(['/login'], { queryParams: { redirect: url } });
}

export const authGuard: CanActivateFn = (route, state) => {
  return ensureTokenOrRedirect(state.url);
};

export const authChildGuard: CanActivateChildFn = (route, state) => {
  return ensureTokenOrRedirect(state.url);
};

export const authMatchGuard: CanMatchFn = (route, segments) => {
  const url = '/' + segments.map(s => s.path).join('/');
  return ensureTokenOrRedirect(url);
};
