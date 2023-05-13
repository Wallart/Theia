import { from } from 'rxjs';
import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ElectronService } from './electron.service';
import { AudioSinkService } from './audio-sink.service';

@Injectable({
  providedIn: 'root'
})
export class HyperionService {
  socket: any;

  model: string = '';
  models: string[] = [];
  prompt: string = '';
  prompts: string[] = [];
  botName: string = '';
  targetUrl: string;
  sid: string = '';

  constructor(private http: HttpClient, private electron: ElectronService,
              private sink: AudioSinkService, private router: Router) {
    if (electron.isElectronApp) {
      this.targetUrl = 'http://deepbox:6450';
    } else {
      this.targetUrl = 'http://localhost:4200/api';
    }

    if (!this.electron.isElectronApp || this.router.url === '/') {
      this.socket = io('ws://deepbox:6450');
      this.socket.on('connect', () => this.onConnect());
      this.socket.on('disconnect', () => this.onDisconnect());
      this.socket.on('error', (err: any) => this.onError(err));
      this.socket.on('interrupt', (timestamp: number) => this.onInterrupt(timestamp));
    }
  }

  onInterrupt(timestamp: number) {
    this.sink.interrupt(new Date(timestamp * 1000));
  }

  onConnect() {
    this.sid = this.socket.id;
    console.log(`WebSocket connected with sid : ${this.sid}`);
  }

  onError(err: any) {
    console.error(err);
  }

  onDisconnect() {
    console.warn('WebSocket connection lost');
  }

  private getHttpOptions() {
    return {
      responseType: 'arraybuffer',
      observe: 'response',
      headers: new HttpHeaders({
        SID: this.sid,
        model: this.model,
        preprompt: this.prompt
      })
    };
  }

  sendChat(user: string, message: string) {
    const payload = new FormData();
    payload.append('user', user);
    payload.append('message', message);

    // @ts-ignore
    return this.http.post(`${this.targetUrl}/chat`, payload, this.getHttpOptions());
  }

  sendImage(image: Blob, width: number, height: number) {
    const payload = new FormData();
    // @ts-ignore
    payload.append('frame', image);
    const options: any = this.getHttpOptions();
    options.headers = options.headers.set('framewidth', `${width}`);
    options.headers = options.headers.set('frameheight', `${height}`);
    options.headers = options.headers.set('framechannels', '3');

    return this.http.post(`${this.targetUrl}/video`, payload, options);
  }

  sendAudio(audio: Int16Array) {
    const payload = new FormData();
    payload.append('audio', new Blob([audio]));

    // @ts-ignore
    return this.http.post(`${this.targetUrl}/audio`, payload, this.getHttpOptions());
  }

  getState() {
    return this.http.get(`${this.targetUrl}/state`, {responseType: 'text'});
  }

  getName() {
    if (this.botName === '') {
      const req = this.http.get(`${this.targetUrl}/name`, {responseType: 'text'});
      req.subscribe((res) => this.botName = res);
      return from(req);
    } else {
      return from([this.botName]);
    }
  }

  getPrompt() {
    if (this.prompt === '') {
      const req = this.http.get(`${this.targetUrl}/prompt`, {responseType: 'text'});
      req.subscribe((res) => this.prompt = res);
      return from(req);
    } else {
      return from([this.prompt]);
    }
  }

  getPrompts() {
    if (this.prompts.length === 0) {
      const req = this.http.get(`${this.targetUrl}/prompts`);
      req.subscribe((res) => this.prompts = res as string[]);
      return from(req);
    } else {
      return from([this.prompts]);
    }
  }

  getModel() {
    if (this.model === '') {
      const req = this.http.get(`${this.targetUrl}/model`, {responseType: 'text'});
      req.subscribe((res) => {
        // debugger;
        this.model = res;
      });
      return from(req);
    } else {
      return from([this.model]);
    }
  }

  getModels() {
    if (this.models.length === 0) {
      const req = this.http.get(`${this.targetUrl}/models`);
      req.subscribe((res) => this.models = res as string[]);
      return from(req);
    } else {
      return from([this.models]);
    }
  }

  frameDecode(buffer: ArrayBuffer, decodedData: any, callback: Function) {
    while (buffer.byteLength > 0) {
      try {
        let chunkHeader = new TextDecoder().decode(buffer.slice(0, 3));
        if (chunkHeader !== 'TIM' && chunkHeader !== 'REQ' && chunkHeader !== 'ANS' && chunkHeader !== 'PCM') {
          break;
        }

        if (chunkHeader === 'TIM') {
          const timestamp = new DataView(buffer.slice(3, 11)).getFloat64(0, true);
          decodedData['TIM'] = new Date(timestamp * 1000);
          buffer = buffer.slice(11);
        } else {
          let chunkSize = new DataView(buffer).getInt32(3)
          let chunkContent: any = buffer.slice(7, 7 + chunkSize);

          if (chunkContent.byteLength < chunkSize) {
            break;
          } else {
            buffer = buffer.slice(7 + chunkSize);
          }

          if (chunkHeader === 'REQ') {
            chunkContent = new TextDecoder().decode(chunkContent);
            decodedData[chunkHeader] = chunkContent;
          } else if(chunkHeader === 'ANS') {
            decodedData['IDX'] = new DataView(chunkContent).getInt8(0);
            chunkContent = new TextDecoder().decode(chunkContent.slice(1));
            decodedData[chunkHeader] = chunkContent;
          } else if (chunkHeader === 'PCM') {
            decodedData['PCM'] = chunkContent;
            callback(decodedData);
            decodedData = {};
          }
        }
      } catch (e) {
        break;
      }
    }
    return buffer;
  }
}
