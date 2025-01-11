import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterEvent, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EventService } from './core/services';
import { AppEvent } from './core/constants';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, MatProgressBarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  loading = signal(false);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.subscribe(routerEvent => {
      this.checkRouterEvent(routerEvent as RouterEvent);
    });
    this.subscribeToAppEvents();
  }

  private subscribeToAppEvents(): void {
    this.eventService.getEventEmitter().subscribe(evt => {
      switch (evt.name) {
        case AppEvent.SHOW_PROGRESS_BAR:
          this.loading.set(true);
          break;
        case AppEvent.HIDE_PROGRESS_BAR:
          this.loading.set(false);
          break;
      }
    });
  }

  private checkRouterEvent(routerEvent: RouterEvent): void {
    if (routerEvent instanceof NavigationStart) {
      this.loading.set(true);
    } else if (
      routerEvent instanceof NavigationEnd ||
      routerEvent instanceof NavigationCancel ||
      routerEvent instanceof NavigationError
    ) {
      this.loading.set(false);
    }
  }
}
