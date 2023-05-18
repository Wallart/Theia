import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StatusService {

  pendingResponses: number = 0;
  typing$ = new BehaviorSubject<boolean>(false);
  state$ = new BehaviorSubject<string>('offline');

  constructor() {}

  online() {
    this.state$.next('online');
  }

  offline() {
    this.state$.next('offline');
  }

  sleeping() {
    this.state$.next('sleeping');
  }

  unknown(code: number) {
    this.state$.next(`Unknown ${code}`);
  }

  addPendingResponse() {
    this.pendingResponses++;
    this.typing$.next(true);
  }

  removePendingResponse() {
    this.pendingResponses--;
    if (this.pendingResponses < 0) this.pendingResponses = 0;
    if (this.pendingResponses === 0) this.typing$.next(false);
  }
}
