import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioSinkService {
  audioCtx: any;
  sampleRate: number;
  busy: boolean;
  queue: any[];

  constructor() {
    this.busy = false;
    this.queue = [];
    this.sampleRate = 24000;
    this.audioCtx = new window.AudioContext({ sampleRate: this.sampleRate });
  }

  onPlaybackEnd() {
    this.busy = false;
    if (this.queue.length > 0) {
      const queuedData = this.queue.splice(0, 1)[0];
      this.setBuffer(queuedData[0], queuedData[1]);
    }
  }

  setBuffer(arrayBuffer: ArrayBuffer, date: Date) {
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
    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);
    source.onended = () => this.onPlaybackEnd();
    source.start();
  }
}
