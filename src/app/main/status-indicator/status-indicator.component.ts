import { Component } from '@angular/core';
import { StatusService } from '../../services/status.service';
import { HyperionService } from '../../services/hyperion.service';

@Component({
  selector: 'status-indicator',
  templateUrl: './status-indicator.component.html',
  styleUrls: ['./status-indicator.component.css']
})
export class StatusIndicatorComponent {
  state: string = '';
  stateClass: string = '';
  bot: string = 'Unknown';
  usage: number = 78;

  constructor(private hyperion: HyperionService, private status: StatusService) {
    this.hyperion.botName$.subscribe((res) => {
      if (res !== '') this.bot = res;
    });
  }

  ngAfterContentInit() {
    this.status.state$.subscribe((state) => {
      this.state = state;
      if (this.state === 'offline') {
        this.stateClass = 'dot';
      } else if (this.state === 'online') {
        this.stateClass = 'dot green';
      } else if (this.state === 'sleeping') {
        this.stateClass = 'dot orange';
      } else if (this.state === 'confused') {
        this.stateClass = 'dot blue';
      } else {
        this.stateClass = 'dot red';
      }
    });
  }
}
