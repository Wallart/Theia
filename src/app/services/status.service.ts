import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class StatusService {

  pendingResponses: number = 0;
  typing$ = new BehaviorSubject<boolean>(false);
  state$ = new BehaviorSubject<string>('offline');

  constructor(private electron: ElectronService) {}

  private notify(value: string) {
    this.state$.next(value);
    this.electron.send('state-change', value);
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
