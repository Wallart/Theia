import { Router } from '@angular/router';
import { Component, ViewChild } from '@angular/core';
import { MediaService } from '../services/media.service';
import { ElectronService } from '../services/electron.service';
import { AudioSinkService } from '../services/audio-sink.service';
import { AudioInputService } from '../services/audio-input.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  @ViewChild('inputLevel') inputLevel: any;

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

  ngAfterViewInit() {
    this.audioInput.noiseLevel$.subscribe((dbs) => {
      const maxDbs = 100;
      const checks = this.inputLevel.nativeElement.getElementsByTagName('span');
      const activeChecks = Math.min(dbs, maxDbs) * checks.length / maxDbs;
      for (let i=0; i < checks.length; i++) {
        if (i < activeChecks) {
          checks[i].setAttribute('class', 'activeLevel');
        } else {
          checks[i].setAttribute('class', '');
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
