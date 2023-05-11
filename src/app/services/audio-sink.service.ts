import { Injectable } from '@angular/core';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AudioSinkService {
  audioCtx: any;
  source: any | AudioBufferSourceNode;
  sampleRate: number;
  busy: boolean;
  muted: boolean;
  queue: any[];
  selectedSpeakers: string = '';
  interruptStamp: Date = new Date(Date.now());

  constructor(private media: MediaService, private electron: ElectronService, private store: LocalStorageService) {
    this.busy = false;
    this.queue = [];
    this.sampleRate = 24000;
    this.audioCtx = new window.AudioContext({ sampleRate: this.sampleRate });
    this.media.speakers$.subscribe((data) => {
      if (data.length > 0) {
        this.selectedSpeakers = data[0].label;
        // this.audioCtx.setSinkId(data[0].deviceId);
      }
    });

    this.electron.bind('out-device-changed', (event: Object, device: string) => {
      console.log(`Output device changed to ${device}`);
      this.currSpeakers = device;
    });

    this.muted = this.store.getItem('speakersMuted') !== null ? JSON.parse(this.store.getItem('speakersMuted')) : false;
  }

  mute() {
    this.muted = true;
    this.store.setItem('speakersMuted', JSON.stringify(this.muted));
    this.stop();
  }

  unmute() {
    this.muted = false;
    this.store.setItem('speakersMuted', JSON.stringify(this.muted));
  }

  stop() {
    this.queue.splice(0);
    if (this.source !== undefined) {
      this.source.stop();
    }
  }

  interrupt(date : Date) {
    this.interruptStamp = date;
    this.stop();
  }

  onPlaybackEnd() {
    this.busy = false;
    if (this.queue.length > 0) {
      const queuedData = this.queue.splice(0, 1)[0];
      this.setBuffer(queuedData[0], queuedData[1]);
    }
  }

  setBuffer(arrayBuffer: ArrayBuffer, date: Date) {
    if (this.muted) {
      return;
    }

    if (date < this.interruptStamp) {
      return;
    }

    if (arrayBuffer.byteLength === 0) {
      console.warn('Empty PCM array.');
      return;
    }

    if (this.busy) {
      this.queue.push([arrayBuffer, date]);
      return;
    }
    this.busy = true;

    // Récupérer les données PCM 16 bits sous forme d'un Float32Array
    const pcmData = new Int16Array(arrayBuffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    // Créer un nouveau AudioBuffer à partir des données Float32
    const audioBuffer = this.audioCtx.createBuffer(1, floatData.length, this.audioCtx.sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    channelData.set(floatData);

    // Créer un nouveau BufferSource et le connecter au contexte audio
    this.source = this.audioCtx.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.audioCtx.destination);
    this.source.onended = () => this.onPlaybackEnd();
    this.source.start();
  }

  set currSpeakers(speakersName: string) {
    this.selectedSpeakers = speakersName;
    const deviceId = this.media.getDeviceId(speakersName, 'audiooutput');
    this.audioCtx.setSinkId(deviceId);
  }
}
