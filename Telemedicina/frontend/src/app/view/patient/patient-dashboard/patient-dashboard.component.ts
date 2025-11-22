import { Component, OnDestroy, OnInit } from '@angular/core';
import { PatientNavbarComponent } from '../components/patient-navbar/patient-navbar.component';
import { NavigationEnd, Router, Event as NgEvent, RouterOutlet } from '@angular/router';
import { AiAssistantFabComponent } from '../../../shared/ai-assistant-fab/ai-assistant-fab.component';
import { filter, Subscription } from 'rxjs';
import {IONIC_COMPONENTS} from '../../../shared/ionic-imports';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    ...IONIC_COMPONENTS,
    PatientNavbarComponent,
    RouterOutlet,
    AiAssistantFabComponent
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.scss'
})

export class PatientDashboardComponent implements OnInit, OnDestroy {
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
    this.showFab = !url.includes('patient-messages');
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
