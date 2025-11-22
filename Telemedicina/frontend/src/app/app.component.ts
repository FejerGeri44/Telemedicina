import {Component, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {UserService} from './services/user/user.service';
import {filter, Subscription} from 'rxjs';
import {IONIC_COMPONENTS} from './shared/ionic-imports';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [
    ...IONIC_COMPONENTS,
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
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const currentUrl = event.urlAfterRedirects;

      if (this.shouldRunRefresh(currentUrl)) {
        this.userService.refresh().subscribe();
      }
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
