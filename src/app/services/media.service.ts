import { Injectable } from '@angular/core';
import { MicVAD, utils, RealTimeVADOptions } from '@ricky0123/vad-web';
import { HyperionService } from './hyperion.service';
import {ChatService} from "./chat.service";
import {AudioSinkService} from "./audio-sink.service";

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  cameras: any;
  speakers: any;
  microphones: any;

  sampleRate: number = 16000;
  chunkDuration: number = 512;

  activityDetector: MicVAD | undefined;

  constructor(private hyperion: HyperionService, private chat: ChatService, private sink: AudioSinkService) {
    this.cameras = [];
    this.speakers = [];
    this.microphones = [];
    this.enumerateDevices();

    this.initVAD();
  }

  async initVAD() {
    this.activityDetector = await MicVAD.new({
      onSpeechStart: () => this.onSpeechStart(),
      onSpeechEnd: (audio) => this.onSpeechEnd(audio),
      onVADMisfire: () => this.onVADMisfire()
    });
  }

  enumerateDevices() {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((device) => {
          // console.log(device.kind + ': ' + device.label + ' id = ' + device.deviceId);
          if (device.kind === 'videoinput') {
            this.cameras.push(device);
          } else if (device.kind === 'audioinput') {
            this.microphones.push(device);
          } else {
            this.speakers.push(device);
          }
        });
      });
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
    this.hyperion.sendAudio(pcmData).subscribe((response: any) => {
      const speaker = response.headers.get('speaker');
      const arrayBuffer = response.body;

      const decodedData = {};
      this.hyperion.frameDecode(arrayBuffer, decodedData, (frame: any) => {
        this.chat.addUserMsg(speaker, [frame['REQ']], frame['TIM']);
        this.chat.addBotMsg([frame['ANS']], frame['TIM']);
        this.sink.setBuffer(frame['PCM'], frame['TIM']);
      });
    });
  }

  onVADMisfire() {
    console.log('VAD is fired ?');
  }

  openMicrophone() {
    if (this.activityDetector !== undefined) {
      this.activityDetector.start();
    }
  }

  closeMicrophone() {
    if (this.activityDetector !== undefined) {
      this.activityDetector.pause();
    }
  }

  // recordMicrophone() {
  //   let mediaRecorder;
  //   navigator.mediaDevices.getUserMedia({ audio: true })
  //     .then((stream) => {
  //       mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: this.sampleRate});
  //       mediaRecorder.addEventListener('dataavailable', (e) => {
  //         debugger;
  //       });
  //       mediaRecorder.start(this.chunkDuration);
  //     })
  //     .catch((err) => console.error(err));
  // }
}
