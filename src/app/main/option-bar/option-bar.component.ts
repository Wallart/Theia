import { ChangeDetectorRef, Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { HyperionService } from '../../services/hyperion.service';


@Component({
  selector: 'option-bar',
  templateUrl: './option-bar.component.html',
  styleUrls: ['./option-bar.component.css']
})
export class OptionBarComponent {
  models: any;
  selectedModel = '';
  prompts: any;
  selectedPrompt = '';

  constructor(public hyperion: HyperionService, private chat: ChatService, private changeDetectorRef: ChangeDetectorRef) {
    this.models = [];
    this.prompts = [];

    this.hyperion.models$.subscribe((res) => this.models = res);
    this.hyperion.prompts$.subscribe((res) => this.prompts = res);

    this.chat.model$.subscribe((res) => {
      this.selectedModel = res as string;
      this.changeDetectorRef.detectChanges();
    });
    this.chat.prompt$.subscribe((res) => {
      this.selectedPrompt = res as string;
      this.changeDetectorRef.detectChanges();
    });
  }

  onModelChanged() {
    this.chat.changeViewModel(this.selectedModel);
  }

  onPromptChanged() {
    this.chat.changeViewPrompt(this.selectedPrompt);
  }
}
