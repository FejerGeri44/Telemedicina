import {Component, OnDestroy, OnInit} from '@angular/core';
import {DoctorNavbarComponent} from '../components/doctor-navbar/doctor-navbar.component';
import {Event as NgEvent, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {AiAssistantFabComponent} from '../../../shared/ai-assistant-fab/ai-assistant-fab.component';
import {filter, Subscription} from 'rxjs';
import {IONIC_COMPONENTS} from '../../../shared/ionic-imports';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    ...IONIC_COMPONENTS,
    DoctorNavbarComponent,
    RouterOutlet,
    AiAssistantFabComponent
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.scss'
})

export class DoctorDashboardComponent implements OnInit, OnDestroy {
  public showFab: boolean = true;
  private routerSubscription!: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkUrl(this.router.url);

    this.routerSubscription = this.router.events.pipe(
      filter((event: NgEvent): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.checkUrl(event.urlAfterRedirects);
    });
  }

  private checkUrl(url: string) {
    this.showFab = !url.includes('doctor-messages');
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
