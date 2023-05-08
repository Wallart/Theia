import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
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
  selectedNoiseThreshold: number;
  maxDbs = 110;

  constructor(private media: MediaService, private audioInput: AudioInputService, private audioSink: AudioSinkService,
              private electron: ElectronService, private router: Router, private title: Title) {
    this.selectedInDevice = this.audioInput.selectedMicrophone;
    this.selectedOutDevice = this.audioSink.selectedSpeakers;
    this.selectedCamDevice = '';
    this.selectedNoiseThreshold = this.audioInput.noiseThreshold;
  }

  ngOnInit() {
    this.title.setTitle('Settings');
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
    if (this.electron.isElectronApp) {
      this.electron.bind('current-noise-changed', (event: Object, dbs: number) => {
        this.onNoiseLevelChanged(dbs);
      });
    } else {
      this.audioInput.noiseLevel$.subscribe((dbs) => this.onNoiseLevelChanged(dbs));
    }
  }

  onNoiseLevelChanged(dbs: number) {
    const checks = this.inputLevel.nativeElement.getElementsByTagName('span');
    const activeChecks = Math.min(dbs, this.maxDbs) * checks.length / this.maxDbs;
    for (let i=0; i < checks.length; i++) {
      if (i < activeChecks) {
        checks[i].setAttribute('class', 'activeLevel');
      } else {
        checks[i].setAttribute('class', '');
      }
    }
  }

  onInDeviceChanged() {
    if (this.electron.isElectronApp) {
      this.electron.send('in-device', this.selectedInDevice);
    } else {
      this.audioInput.currMicrophone = this.selectedInDevice;
      this.router.navigate(['/']);
    }
  }

  onOutDeviceChanged() {
    if (this.electron.isElectronApp) {
      this.electron.send('out-device', this.selectedOutDevice);
    } else {
      this.audioSink.currSpeakers = this.selectedOutDevice;
      this.router.navigate(['/']);
    }
  }

  onCamChanged() {
    if (this.electron.isElectronApp) {
    } else {
      this.router.navigate(['/']);
    }
  }

  onThresholdChanged() {
    if (this.electron.isElectronApp) {
      this.electron.send('noise-threshold', this.selectedNoiseThreshold);
    } else {
      this.audioInput.currThreshold = this.selectedNoiseThreshold;
      this.router.navigate(['/']);
    }
  }
}
