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
  selectedModel: string;
  prompts: any;
  selectedPrompt: string;
  state: string = '';

  constructor(public hyperion: HyperionService, private store: LocalStorageService, private status: StatusService) {
    this.selectedModel = this.store.getItem('model') !== null ? this.store.getItem('model') : '';
    this.hyperion.model = this.selectedModel;

    this.selectedPrompt = this.store.getItem('prompt') !== null ? this.store.getItem('prompt') : '';
    this.hyperion.prompt = this.selectedPrompt;

    this.models = [];
    this.prompts = [];
    this.status.state$.subscribe((state) => this.state = state);
  }

  ngOnInit() {
    this.hyperion.models$.subscribe((res) => this.models = res);
    this.hyperion.model$.subscribe((res) => this.selectedModel = res as string);

    this.hyperion.prompts$.subscribe((res) => this.prompts = res);
    this.hyperion.prompt$.subscribe((res) => this.selectedPrompt = res as string);
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
