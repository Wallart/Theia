import { Injectable } from '@angular/core';
import { MicVAD } from '@ricky0123/vad-web';
import { ChatService } from './chat.service';
import { HyperionService } from './hyperion.service';
import { AudioSinkService } from './audio-sink.service';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioInputService {

  // sampleRate: number = 16000;
  dbContext: AudioContext | undefined;
  activityDetector: MicVAD | undefined;
  muted: boolean = true;
  selectedMicrophone: string = '';

  noiseThreshold: number = 30;
  noiseLevel: number = 0;
  noiseLevel$: BehaviorSubject<number> = new BehaviorSubject<number>(this.noiseLevel);
  speaking = false;
  speaking$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.speaking);


  constructor(private hyperion: HyperionService, private chat: ChatService, private sink: AudioSinkService,
              private media: MediaService, private electron: ElectronService) {
    if (this.electron.isElectronApp) {
      const ort = require('onnxruntime-web');
      const rootUrl = `${window.location.protocol}${window.location.pathname}`;
      ort.env.wasm.wasmPaths = rootUrl;
      // console.log(rootUrl);
    }

    this.media.microphones$.subscribe((data) => {
      if (data.length > 0) {
        this.selectedMicrophone = data[0].label;
        this.initVADWithStream(data[0].deviceId, !this.muted);
      }
    });

    this.electron.bind('in-device-changed', (event: Object, device: string) => {
      console.log(`Input device changed to ${device}`);
      this.currMicrophone = device;
    });

    this.electron.bind('noise-threshold-changed', (event: Object, dBValue: number) => {
      console.log(`Noise threshold changed to ${dBValue}`);
      this.noiseThreshold = dBValue;
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

    this.hyperion.sendAudio(pcmData).subscribe((response: any) => {
      if (response.status !== 200) {
        return;
      }

      const speaker = response.headers.get('speaker');
      const arrayBuffer = response.body;

      const decodedData = {};
      this.hyperion.frameDecode(arrayBuffer, decodedData, (frame: any) => {
        if (frame['IDX'] === 0) {
          this.chat.addUserMsg(speaker, [frame['REQ']], frame['TIM']);
        }
        this.chat.addBotMsg([frame['ANS']], frame['TIM']);
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

  onVADMisfire() {
    console.log('VAD is fired ?');
  }

  openMicrophone() {
    this.muted = false;
    if (this.activityDetector !== undefined) {
      this.activityDetector.start();
    }
  }

  closeMicrophone() {
    this.muted = true;
    if (this.activityDetector !== undefined) {
      this.activityDetector.pause();
    }
  }

  set currMicrophone(microphoneName: string) {
    const autostart = !this.muted;
    this.closeMicrophone();
    delete this.activityDetector;

    this.selectedMicrophone = microphoneName;
    this.initVADWithStream(this.media.getDeviceId(microphoneName, 'audioinput'), autostart);
    this.muted = !autostart;
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

