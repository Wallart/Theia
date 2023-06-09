import { Component } from '@angular/core';
import { StatusService } from '../../services/status.service';
import { HyperionService } from '../../services/hyperion.service';
import { LocalStorageService } from '../../services/local-storage.service';


@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css']
})
export class TopBarComponent {
  models: any;
  selectedModel = '';
  prompts: any;
  selectedPrompt = '';
  state: string = '';
  stateClass: string = '';
  bot: string = 'Unknown';

  constructor(public hyperion: HyperionService, private store: LocalStorageService, private status: StatusService) {
    this.models = [];
    this.prompts = [];

    this.hyperion.botName$.subscribe((res) => {
      if (res !== '') this.bot = res;
    });

    this.hyperion.models$.subscribe((res) => this.models = res);
    this.hyperion.model$.subscribe((res) => this.selectedModel = res as string);

    this.hyperion.prompts$.subscribe((res) => this.prompts = res);
    this.hyperion.prompt$.subscribe((res) => this.selectedPrompt = res as string);
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

  onModelChanged() {
    this.hyperion.model = this.selectedModel;
    this.store.setItem('model', this.selectedModel);
  }

  onPromptChanged() {
    this.hyperion.prompt = this.selectedPrompt;
    this.store.setItem('prompt', this.selectedPrompt);
  }
}
