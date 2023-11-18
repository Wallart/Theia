import { Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { StatusService } from '../../services/status.service';
import { HyperionService } from '../../services/hyperion.service';


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

  constructor(public hyperion: HyperionService, private chat: ChatService, private status: StatusService) {
    this.models = [];
    this.prompts = [];

    this.hyperion.botName$.subscribe((res) => {
      if (res !== '') this.bot = res;
    });

    this.hyperion.models$.subscribe((res) => this.models = res);
    this.chat.model$.subscribe((res) => this.selectedModel = res as string);

    this.hyperion.prompts$.subscribe((res) => this.prompts = res);
    this.chat.prompt$.subscribe((res) => this.selectedPrompt = res as string);
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
    this.chat.changeViewModel(this.selectedModel);
  }

  onPromptChanged() {
    this.chat.changeViewPrompt(this.selectedPrompt);
  }
}
