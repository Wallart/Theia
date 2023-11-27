import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ElectronService } from '../services/electron.service';
import { HyperionService } from '../services/hyperion.service';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})
export class EditComponent {
  promptContent: string = '';
  promptName: string = '';

  constructor(private title: Title, private electron: ElectronService, private hyperion: HyperionService,
              private router: Router, private route: ActivatedRoute) {
  }

  ngOnInit() {
    // this.title.setTitle('Edit prompt');
    this.route.queryParams.subscribe(params => {
      this.promptName = params['prompt'];
      this.title.setTitle(`Edit prompt ${this.promptName}`);
      this.hyperion.readPrompt(this.promptName).subscribe((res: any) => {
        this.promptContent = res;
      });
    });
  }

  onCancel() {
    if (this.electron.isElectronApp) {
      this.electron.send('close-edit');
    } else {
      this.router.navigate(['/']);
    }
  }

  onSave() {
    const promptFile = new File([this.promptContent], this.promptName, {type: 'text/plain'});
    this.hyperion.uploadPrompts([promptFile]).subscribe(() => {
      if (this.electron.isElectronApp) {
        this.electron.send('close-edit');
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
