import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { MicVAD } from '@ricky0123/vad-web';
import { ChatService } from './chat.service';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { HyperionService } from './hyperion.service';
import { AudioSinkService } from './audio-sink.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AudioInputService {

  // sampleRate: number = 16000;
  dbContext: AudioContext | undefined;
  activityDetector: MicVAD | undefined;
  muted: boolean;
  selectedMicrophone: string = '';
  selectedMicrophone$: BehaviorSubject<string> = new BehaviorSubject<string>(this.selectedMicrophone);

  noiseThreshold: number;
  noiseLevel: number = 0;
  noiseLevel$: BehaviorSubject<number> = new BehaviorSubject<number>(this.noiseLevel);
  speaking = false;
  speaking$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.speaking);


  constructor(private hyperion: HyperionService, private chat: ChatService, private sink: AudioSinkService,
              private media: MediaService, private electron: ElectronService, private store: LocalStorageService,
              private router: Router) {
    if (this.electron.isElectronApp && this.router.url === '/') {
      const ort = require('onnxruntime-web');
      const rootUrl = `${window.location.protocol}${window.location.pathname}`;
      ort.env.wasm.wasmPaths = rootUrl;
      console.log(rootUrl);
    }

    this.noiseThreshold = this.store.getItem('dbThreshold') !== null ? this.store.getItem('dbThreshold') : 30;
    this.muted = this.store.getItem('micMuted') !== null ? JSON.parse(this.store.getItem('micMuted')) : true;

    this.media.microphones$.subscribe((data) => {
      if (data.length > 0) {
        let label = data[0].label;
        let deviceId = data[0].deviceId;
        if (this.store.getItem('microphone') !== null) {
          label = this.store.getItem('microphone');
          deviceId = this.media.getDeviceId(label, 'audioinput');
          if (deviceId === null) {
            label = data[0].label;
            deviceId = data[0].deviceId;
          }
        }

        deviceId = (deviceId === 'default' ? this.media.getDeviceId(label, 'audioinput') : deviceId);
        if (this.selectedMicrophone !== label) {
          this.selectedMicrophone = label;
          this.selectedMicrophone$.next(label);
          this.initVADWithStream(deviceId, !this.muted);
        }
      }
    });

    this.electron.bind('in-device-changed', (event: Object, device: string) => {
      console.log(`Input device changed to ${device}`);
      this.currMicrophone = device;
    });

    this.electron.bind('noise-threshold-changed', (event: Object, dBValue: number) => {
      console.log(`Noise threshold changed to ${dBValue}`);
      this.currThreshold = dBValue;
    });
  }

  async initVAD(stream: MediaStream) {
    this.activityDetector = await MicVAD.new({
      stream: stream,
      onSpeechStart: () => this.onSpeechStart(),
      onSpeechEnd: (audio) => this.onSpeechEnd(audio),
      onVADMisfire: () => this.onVADMisfire()
    });
  }

  initVADWithStream(deviceId: string, autostart: boolean) {
    if (this.electron.isElectronApp && this.router.url !== '/') return;

    this.media.getDeviceStream(deviceId, 'audio')
      .then((stream) => {
        this.createDbMeter(stream);
        this.initVAD(stream).then(() => {
          if (autostart) {
            this.activityDetector?.start();
          }
        })
      })
      .catch(console.error);
  }

  onVADMisfire() {
    console.log('VAD is fired ?');
    this.speaking = false;
    this.speaking$.next(this.speaking);
  }

  onSpeechStart() {
    console.log('Speech started.');
    this.speaking = true;
    this.speaking$.next(this.speaking);
  }

  onSpeechEnd(audio: Float32Array) {
    console.log('Speech ended.');
    this.speaking = false;
    this.speaking$.next(this.speaking);

    const pcmData = this.convertToInt16(audio);
    const rms = this.computeRMS(pcmData);
    const dbs = this.computeDBs(rms);

    if (dbs < this.noiseThreshold) {
      return;
    }

    this.hyperion.sendAudio(pcmData).then((subject: any) => {
      subject.subscribe((frame: any) => {
        if (frame['IDX'] === 0) {
          this.chat.addUserMsg(frame['SPK'], frame['REQ'], frame['TIM']);
        }
        this.chat.addBotMsg(frame['ANS'], frame['TIM']);
        this.sink.setBuffer(frame['PCM'], frame['TIM']);
      });
    });
  }

  updateNoiseLevel(dbs: number) {
    this.noiseLevel = dbs;
    if (this.electron.isElectronApp) {
      this.electron.send('current-noise', this.noiseLevel);
    } else {
      this.noiseLevel$.next(this.noiseLevel);
    }
  }

  openMicrophone() {
    this.muted = false;
    this.store.setItem('micMuted', JSON.stringify(this.muted));
    if (this.activityDetector !== undefined) {
      this.activityDetector.start();
    }
  }

  closeMicrophone() {
    this.muted = true;
    this.store.setItem('micMuted', JSON.stringify(this.muted));
    if (this.activityDetector !== undefined) {
      this.activityDetector.pause();
    }

    this.speaking = false;
    this.speaking$.next(this.speaking);
  }

  set currMicrophone(microphoneName: string) {
    const autostart = !this.muted;
    this.closeMicrophone();
    delete this.activityDetector;

    this.selectedMicrophone = microphoneName;
    this.store.setItem('microphone', microphoneName);
    this.initVADWithStream(this.media.getDeviceId(microphoneName, 'audioinput'), autostart);
    this.muted = !autostart;
  }

  set currThreshold(thresh: number) {
    this.noiseThreshold = thresh;
    this.store.setItem('dbThreshold', thresh);
  }

  convertToInt16(audio: Float32Array) {
    for (let i = 0; i < audio.length; i++) {
      audio[i] = audio[i] * 32768.0;
    }
    return new Int16Array(audio);
  }

  computeRMS(array: Int16Array) {
    let rms = 0;
    for (let i=0; i < array.length; i += 1) {
      rms += array[i] * array[i];
    }
    rms /= array.length;
    rms = Math.sqrt(rms);
    return rms;
  }

  computeDBs(rms: number) {
    let dbs = 0;
    if (rms > 0) {
      dbs = 20 * Math.log10(rms);
    }
    return dbs;
  }

  createDbMeter(stream: MediaStream) {
    if (this.dbContext !== undefined) {
      this.dbContext
        .close()
        .then(() => this.startDbMeter(stream));
    } else {
      this.startDbMeter(stream);
    }
  }

  startDbMeter(stream: MediaStream) {
    this.dbContext = new AudioContext();
    const source = this.dbContext.createMediaStreamSource(stream);
    const analyser = this.dbContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 8192;

    this.dbContext.audioWorklet.addModule('worklets/db-meter.js')
      .then(() => {
        // @ts-ignore
        let dbMeter = new AudioWorkletNode(this.dbContext, 'db-meter-processor');
        dbMeter.port.onmessage = (event) => {
          // Handling data from the processor.
          // console.log(event.data);
          this.updateNoiseLevel(event.data);
        };

        // @ts-ignore
        source.connect(analyser).connect(dbMeter).connect(this.dbContext.destination);
      })
      .catch(console.error);
  }
}

