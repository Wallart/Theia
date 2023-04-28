import { Component } from '@angular/core';
import { MediaService } from '../services/media.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  input_devices: any;
  output_devices: any;
  cameras: any;

  constructor(private media: MediaService) {
    this.input_devices = media.microphones;
    this.output_devices = media.speakers;
    this.cameras = media.cameras;
  }
}
