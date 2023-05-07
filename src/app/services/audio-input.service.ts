import { Injectable } from '@angular/core';
import { MicVAD } from '@ricky0123/vad-web';
import { ChatService } from './chat.service';
import { HyperionService } from './hyperion.service';
import { AudioSinkService } from './audio-sink.service';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { BehaviorSubject, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AudioInputService {

  // sampleRate: number = 16000;
  activityDetector: MicVAD | undefined;
  muted: boolean = true;
  selectedMicrophone: string = '';

  noiseLevel: number = 0;
  noiseLevel$: BehaviorSubject<number> = new BehaviorSubject<number>(this.noiseLevel);
  noiseTimeout: any = null;

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
  }

  onSpeechEnd(audio: Float32Array) {
    console.log('Speech ended.');
    // console.log(audio);
    for (let i = 0; i < audio.length; i++) {
      audio[i] = audio[i] * 32768.0;
    }
    const pcmData = new Int16Array(audio);
    const rms = this.computeRMS(pcmData);
    const dbs = this.computeDBs(rms);
    this.updateNoiseLevel(dbs);

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
    this.noiseLevel$.next(this.noiseLevel);
    if (this.noiseTimeout !== null){
      clearTimeout(this.noiseTimeout);
    }
    if (dbs > 0) {
      setTimeout(() => {
        this.updateNoiseLevel(0);
      }, 1000);
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
    const db = 20 * Math.log10(rms);
    return db;
  }
}

