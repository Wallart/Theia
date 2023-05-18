import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StatusService {

  pendingResponses: number = 0;
  typing$ = new BehaviorSubject<boolean>(false);

  constructor() {}

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
