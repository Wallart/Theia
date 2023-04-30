import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MediaService } from '../services/media.service';
import { ElectronService } from '../services/electron.service';
import { AudioInputService } from '../services/audio-input.service';
import { AudioSinkService } from '../services/audio-sink.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  inDevices: any[] = [];
  outDevices: any[] = [];
  cameraDevices: any[] = [];

  selectedInDevice: string;
  selectedOutDevice: string;
  selectedCamDevice: string;

  constructor(private media: MediaService, private audioInput: AudioInputService, private audioSink: AudioSinkService,
              private electron: ElectronService, private router: Router) {
    this.selectedInDevice = this.audioInput.selectedMicrophone;
    this.selectedOutDevice = this.audioSink.selectedSpeakers;
    this.selectedCamDevice = '';
  }

  ngOnInit() {
    this.media.microphones$.subscribe((data) => {
      if (data.length > 0) {
        this.inDevices = data;
        if (this.selectedInDevice === '') {
          this.selectedInDevice = data[0].label;
        }
      }
    });
    this.media.speakers$.subscribe((data) => {
      if (data.length > 0) {
        this.outDevices = data;
        if (this.selectedOutDevice === '') {
          this.selectedOutDevice = data[0].label;
        }
      }
    });
    this.media.cameras$.subscribe((data) => {
      if (data.length > 0) {
        this.cameraDevices = data;
        if (this.selectedCamDevice === '') {
          this.selectedCamDevice = data[0].label;
        }
      }
    });
  }

  onInDeviceChanged() {
    this.audioInput.currMicrophone = this.selectedInDevice;
    if (!this.electron.isElectronApp) {
      this.router.navigate(['/']);
    }
  }

  onOutDeviceChanged() {
    this.audioSink.currSpeakers = this.selectedOutDevice;
    if (!this.electron.isElectronApp) {
      this.router.navigate(['/']);
    }
  }

  onCamChanged() {
    if (!this.electron.isElectronApp) {
      this.router.navigate(['/']);
    }
  }
}
