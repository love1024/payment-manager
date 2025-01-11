import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface AppEvent {
  name: string;
  data?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private emitter = new Subject<AppEvent>();

  dispatchEvent(name: string, data?: unknown): void {
    this.emitter.next({ name, data });
  }

  getEventEmitter(): Observable<AppEvent> {
    return this.emitter.asObservable();
  }
}
