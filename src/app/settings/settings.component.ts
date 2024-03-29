import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Component, ViewChild } from '@angular/core';
import { MediaService } from '../services/media.service';
import { StatusService } from '../services/status.service';
import { HyperionService } from '../services/hyperion.service';
import { ElectronService } from '../services/electron.service';
import { AudioSinkService } from '../services/audio-sink.service';
import { AudioInputService } from '../services/audio-input.service';
import { VideoInputService } from '../services/video-input.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  @ViewChild('urlIndicator') urlIndicator: any;
  @ViewChild('inputLevel') inputLevel: any;

  inDevices: any[] = [];
  outDevices: any[] = [];
  cameraDevices: any[] = [];
  speechEngines: string[] = [];
  voices: string[] = [];

  serverAddress: string;
  selectedInDevice: string;
  selectedOutDevice: string;
  selectedCamDevice: string;
  selectedNoiseThreshold: number;
  selectedSpeechEngine: string = '';
  selectedVoice: string = '';
  maxDbs = 110;

  constructor(private media: MediaService, private audioInput: AudioInputService, private audioSink: AudioSinkService,
              private electron: ElectronService, private router: Router, private title: Title,
              private videoInput: VideoInputService, private hyperion: HyperionService, private status: StatusService) {
    this.serverAddress = this.hyperion.rootUrl;
    this.selectedInDevice = this.audioInput.selectedMicrophone;
    this.selectedOutDevice = this.audioSink.selectedSpeakers;
    this.selectedCamDevice = this.videoInput.selectedCamera;
    this.selectedNoiseThreshold = this.audioInput.noiseThreshold;
  }

  ngOnInit() {
    this.title.setTitle('Settings');

    this.media.microphones$.subscribe((data) => {
      if (data.length > 0) this.inDevices = data;
    });
    this.audioInput.selectedMicrophone$.subscribe((data) => {
      this.selectedInDevice = data;
    });

    this.media.speakers$.subscribe((data) => {
      if (data.length > 0) this.outDevices = data;
    });
    this.audioSink.selectedSpeakers$.subscribe((data) => {
      this.selectedOutDevice = data;
    });

    this.media.cameras$.subscribe((data) => {
      if (data.length > 0) this.cameraDevices = data;
    });
    this.videoInput.selectedCamera$.subscribe((data) => {
      this.selectedCamDevice = data;
    });
  }

  ngAfterViewInit() {
    if (this.electron.isElectronApp) {
      this.electron.bind('current-noise-changed', (event: Object, dbs: number) => this.onNoiseLevelChanged(dbs));

      this.electron.send('request-state');
      this.electron.bind('state-changed', (event: Object, status: string) => this.onStatusChanged(status));

      this.electron.send('request-voice-settings');
      this.electron.bind('voice-settings-changed', (event: Object, settings: any) => {
        this.speechEngines = settings['speechEngines'];
        this.selectedSpeechEngine = settings['selectedEngine'];
        this.voices = settings['voices'];
        this.selectedVoice = settings['selectedVoice'];
      });

    } else {
      this.audioInput.noiseLevel$.subscribe((dbs) => this.onNoiseLevelChanged(dbs));
      this.status.state$.subscribe((status) => this.onStatusChanged(status));
      this.hyperion.speechEngines$.subscribe((engines: any) => this.speechEngines = engines);
      this.hyperion.selectedSpeechEngine$.subscribe((engine: any) => this.selectedSpeechEngine = engine);
      this.hyperion.voices$.subscribe((voices: any) => this.voices = voices);
      this.hyperion.selectedVoice$.subscribe((voice: any) => this.selectedVoice = voice);
    }
  }


  onStatusChanged(status: string) {
    if (status === 'offline') {
      this.urlIndicator.nativeElement.setAttribute('class', 'dot invalid-input');
    } else {
      this.urlIndicator.nativeElement.setAttribute('class', 'dot valid-input');
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
      this.electron.send('cam-device', this.selectedCamDevice);
    } else {
      this.videoInput.currCamera = this.selectedCamDevice;
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

  onAddressChanged() {
    this.serverAddress = this.serverAddress.trim()
    if (this.electron.isElectronApp) {
      this.electron.send('address-change', this.serverAddress);
    } else {
      this.hyperion.disconnectSocket();
      this.hyperion.address = this.serverAddress;
      this.hyperion.connectSocket();
    }
  }

  onSpeechEngineChanged() {
    let preferredEngines = this.speechEngines.filter(item => item !== this.selectedSpeechEngine);
    preferredEngines.unshift(this.selectedSpeechEngine);
    if (this.electron.isElectronApp) {
      this.electron.send('voice-engines-change', preferredEngines);
    } else {
      this.hyperion.setSpeechEngines(preferredEngines);
    }
  }

  onVoiceChanged() {
    if (this.electron.isElectronApp) {
      this.electron.send('voice-change', [this.selectedSpeechEngine, this.selectedVoice]);
    } else {
      this.hyperion.setVoice(this.selectedSpeechEngine, this.selectedVoice);
    }
  }
}
