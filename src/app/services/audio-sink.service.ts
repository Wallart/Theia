import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioSinkService {
  audioCtx: any;
  source: any | AudioBufferSourceNode;
  sampleRate: number;
  busy: boolean;
  muted: boolean = false;
  queue: any[];

  constructor() {
    this.busy = false;
    this.queue = [];
    this.sampleRate = 24000;
    this.audioCtx = new window.AudioContext({ sampleRate: this.sampleRate });
  }

  mute() {
    this.muted = true;
    this.stop();
  }

  unmute() {
    this.muted = false;
  }

  stop() {
    this.queue.splice(0);
    if (this.source !== undefined) {
      this.source.stop();
    }
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
}
