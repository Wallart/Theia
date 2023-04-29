import { Component } from '@angular/core';
import { HyperionService } from '../../services/hyperion.service';


@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css']
})
export class TopBarComponent {
  models: any;
  selectedModel: string;
  prompts: any;
  selectedPrompt: string;
  state: string;

  constructor(public hyperion: HyperionService) {
    this.selectedModel = '';
    this.selectedPrompt = '';
    this.models = [];
    this.prompts = [];
    this.state = 'offline';
  }

  ngOnInit() {
    this.hyperion.getModels().subscribe((res) => this.models = res);
    this.hyperion.getModel().subscribe((res) => this.selectedModel = res as string);

    this.hyperion.getPrompts().subscribe((res) => this.prompts = res);
    this.hyperion.getPrompt().subscribe((res) => this.selectedPrompt = res as string);
    this.hyperion.getState().subscribe((res) => this.state = 'online');
  }

  onModelChanged() {
    this.hyperion.model = this.selectedModel;
  }

  onPromptChanged() {
    this.hyperion.prompt = this.selectedPrompt;
  }
}
