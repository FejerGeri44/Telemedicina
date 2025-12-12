import {Component, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {UserService} from './services/user/user.service';
import {filter, Subscription, switchMap} from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [
    RouterOutlet
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  private routerSubscription!: Subscription;

  constructor(
    private userService: UserService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      filter((event: NavigationEnd) => this.shouldRunRefresh(event.urlAfterRedirects)),
      switchMap(() => this.userService.refresh())
    ).subscribe({
      next: (res) => {},
      error: (err) => console.error('Refresh hiba', err)
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private shouldRunRefresh(url: string): boolean {
    const protectedRoutes = ['/patient/', '/doctor/', '/admin/'];
    return protectedRoutes.some(prefix => url.startsWith(prefix));
  }
}
