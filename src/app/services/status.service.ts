import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class StatusService {

  currentState = 'offline';
  pendingResponses: number = 0;
  typing$ = new BehaviorSubject<boolean>(false);
  state$ = new BehaviorSubject<string>(this.currentState);

  constructor(private electron: ElectronService) {
    this.electron.bind('state-requested', (event: Object) => {
      this.electron.send('state-change', this.currentState);
    });
  }

  private notify(value: string) {
    this.currentState = value;
    this.state$.next(this.currentState);
    this.electron.send('state-change', this.currentState);
  }

  online() {
    this.notify('online');
  }

  offline() {
    this.notify('offline');
  }

  sleeping() {
    this.notify('sleeping');
  }

  unknown(code: number) {
    this.notify(`Unknown ${code}`);
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
