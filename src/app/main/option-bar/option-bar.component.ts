import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { IndexService } from '../../services/index.service';
import { ChangeDetectorRef, Component } from '@angular/core';
import { HyperionService } from '../../services/hyperion.service';
import { ElectronService } from '../../services/electron.service';
import { LocalStorageService } from '../../services/local-storage.service';


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
  indexes: string[] = [];
  selectedIndexes: string[] = [];

  constructor(public hyperion: HyperionService, private chat: ChatService, private index: IndexService, private store: LocalStorageService,
              private changeDetectorRef: ChangeDetectorRef, private router: Router, private electron: ElectronService) {
    this.models = [];
    this.prompts = [];

    // See ng-select documentation [...res]
    this.hyperion.models$.subscribe((res) => this.models = [...res]);
    this.hyperion.prompts$.subscribe((res) => this.prompts = [...res]);
    this.index.indexes$.subscribe((res) => this.indexes = [...res]);

    this.chat.model$.subscribe((res) => {
      this.selectedModel = res as string;
      this.changeDetectorRef.detectChanges();
    });
    this.chat.prompt$.subscribe((res) => {
      this.selectedPrompt = res as string;
      this.changeDetectorRef.detectChanges();
    });
    this.chat.indexes$.subscribe((res: string[]) => {
      this.selectedIndexes = res;
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

  onEditPrompt(prompt: string) {
    if (this.electron.isElectronApp) {
      this.electron.send('open-edit', prompt);
    } else {
      this.router.navigate(['/edit'], { queryParams: { prompt: prompt } });
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

  onAddIndex(indexName: string) {
    // [addTag]="onAddIndex.bind(this)"
    // See ng-select doc
    return new Promise((resolve) => {
      this.hyperion.createIndex(indexName).subscribe((res) => resolve(indexName));
    });
  }

  onManageIndexes() {
    if (this.electron.isElectronApp) {
      this.electron.send('open-indexes');
    } else {
      this.router.navigate(['/indexes']);
    }
  }

  onIndexSelected() {
    debugger;
    this.chat.changeViewIndexes(this.selectedIndexes);
  }
}
