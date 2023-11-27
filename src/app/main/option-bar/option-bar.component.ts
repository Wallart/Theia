import { ChangeDetectorRef, Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { HyperionService } from '../../services/hyperion.service';


@Component({
  selector: 'option-bar',
  templateUrl: './option-bar.component.html',
  styleUrls: ['./option-bar.component.css']
})
export class OptionBarComponent {
  models: string[];
  selectedModel = '';
  prompts: string[];
  selectedPrompt: any = '';
  prevSelectedPrompt = '';

  constructor(public hyperion: HyperionService, private chat: ChatService, private changeDetectorRef: ChangeDetectorRef) {
    this.models = [];
    this.prompts = [];

    // See ng-select documentation [...res]
    this.hyperion.models$.subscribe((res) => this.models = [...res]);
    this.hyperion.prompts$.subscribe((res) => this.prompts = [...res]);

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

  onPromptChanged(prompt: string) {
    if (this.prompts.indexOf(prompt) > -1) {
      this.chat.changeViewPrompt(this.selectedPrompt);
    } else if (this.prompts.indexOf(this.prevSelectedPrompt) > -1) {
      this.selectedPrompt = this.prevSelectedPrompt;
    } else {
      this.selectedPrompt = this.prompts[0];
      this.chat.changeViewPrompt(this.selectedPrompt);
    }
  }

  onPromptDeleted(event: any, prompt: string) {
    // Because deletion will trigger a change event.
    this.prevSelectedPrompt = this.selectedPrompt;

    let foundPos = this.prompts.indexOf(prompt);
    if (foundPos > -1) {
      this.prompts.splice(foundPos, 1);
    }

    this.hyperion.deletePrompt(prompt).subscribe((res) => {
      console.log(res);
      this.hyperion.getPrompts();
    });

    this.selectedPrompt = null;
  }

  onPromptUploaded(event: any) {
    const files: File[] = event.target.files;
    this.hyperion.uploadPrompts(files).subscribe(() => this.hyperion.getPrompts());
  }
}
