import { Component } from '@angular/core';
import { HyperionService } from '../../services/hyperion.service';


@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.css'],
  providers: [HyperionService]
})
export class TopBarComponent {
  models: any;
  prompts: any;

  constructor(private hyperion: HyperionService) {
    this.models = [];
    this.prompts = [];
    hyperion.getModels().subscribe((response) => this.models = response);
    hyperion.getPrompts().subscribe((response) => this.prompts = response);
  }
}
