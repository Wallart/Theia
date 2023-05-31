import {BehaviorSubject, from, Subject} from 'rxjs';
import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { StatusService } from './status.service';
import { ElectronService } from './electron.service';
import { AudioSinkService } from './audio-sink.service';
import { LocalStorageService } from './local-storage.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HyperionService {
  socket: any;

  pollInterval: any;
  model: string = '';
  model$: BehaviorSubject<string> = new BehaviorSubject<string>(this.model);
  models: string[] = [];
  models$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(this.models);
  prompt: string = '';
  prompt$: BehaviorSubject<string> = new BehaviorSubject<string>(this.prompt);
  prompts: string[] = [];
  prompts$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(this.prompts);
  botName: string = '';
  botName$: BehaviorSubject<string> = new BehaviorSubject<string>(this.botName);
  rootUrl: string = '';
  targetUrl: string = '';
  socketUrl: string = '';
  sid: string = '';

  constructor(private http: HttpClient, private electron: ElectronService, private sink: AudioSinkService,
              private router: Router, private status: StatusService, private store: LocalStorageService) {
    this.address = this.store.getItem('serverAddress') === null ? 'localhost:6450' : this.store.getItem('serverAddress');
    if (!this.electron.isElectronApp || this.router.url === '/') {
      this.connectSocket();
    }

    // this.getState().subscribe((res) => this.status.online());
    this.electron.bind('address-changed', (event: Object, address: string) => {
      this.disconnectSocket();
      this.address = address;
      this.connectSocket();
    });
  }

  pollChanges() {
    this.getModels();
    this.getPrompts();
    this.pollInterval = setTimeout(() => this.pollChanges(), 60 * 1000);
  }

  set address(rootUrl: string) {
    this.rootUrl = rootUrl;
    this.targetUrl = `https://${this.rootUrl}`;
    this.socketUrl = `wss://${this.rootUrl}`;
    this.store.setItem('serverAddress', rootUrl);
  }

  connectSocket() {
    this.socket = io(this.socketUrl);
    this.socket.on('connect', () => this.onConnect());
    this.socket.on('disconnect', (reason: string) => this.onDisconnect(reason));
    this.socket.on('error', (err: any) => this.onError(err));
    this.socket.on('interrupt', (timestamp: number) => this.onInterrupt(timestamp));
  }

  disconnectSocket() {
    if (this.socket !== undefined) {
      this.socket.disconnect();
    }
  }

  onInterrupt(timestamp: number) {
    this.sink.interrupt(new Date(timestamp * 1000));
  }

  onConnect() {
    this.sid = this.socket.id;
    console.log(`WebSocket connected with sid : ${this.sid}`);
    this.status.online();
    this.getPrompt();
    this.getPrompts();
    this.getModel();
    this.getModels();
    this.getName();
    this.pollChanges();
  }

  onError(err: any) {
    console.error(err);
  }

  onDisconnect(reason: string) {
    console.warn(`WebSocket connection closed : ${reason}`);
    this.status.offline();
    clearTimeout(this.pollInterval);
  }

  private getHttpHeaders() {
    return {
      SID: this.sid,
      model: this.model,
      preprompt: this.prompt,
      silent: this.sink.muted.toString()
    };
  }

  drainStream(status: number, reader: any) {
    const subject = new Subject<any>();
    if (status === 200) {
      this.status.online();
      this.status.addPendingResponse();
      let buffer = new Uint8Array(0).buffer;
      let decodedData = {};
      const pump = (data: any) => {
        const {done, value} = data;
        if (done) {
          this.status.removePendingResponse();
          return;
        }

        buffer = this.concatenateArrayBuffers(buffer, value.buffer);
        buffer = this.frameDecode(buffer, decodedData, (frame: any) => subject.next(frame));

        reader?.read().then(pump);
      };

      reader?.read().then(pump);
    } else if (status === 418) {
      this.status.sleeping();
    } else if(status === 204) {
      this.status.confused();
    } else {
      this.status.unknown(status);
    }

    return subject;
  }

  sendChat(user: string, message: string) {
    const payload = new FormData();
    payload.append('user', user);
    payload.append('message', message);

    const options: any = {
      method: 'POST',
      body: payload,
      headers: this.getHttpHeaders()
    }

    return fetch(`${this.targetUrl}/chat`, options)
      .then(res => this.drainStream(res.status, res.body?.getReader()));
  }

  sendAudio(audio: Int16Array) {
    const payload = new FormData();
    payload.append('audio', new Blob([audio]));

    const options: any = {
      method: 'POST',
      body: payload,
      headers: this.getHttpHeaders()
    }

    return fetch(`${this.targetUrl}/audio`, options)
      .then(res => this.drainStream(res.status, res.body?.getReader()));
  }

  sendImage(image: Blob, width: number, height: number) {
    const payload = new FormData();
    // @ts-ignore
    payload.append('frame', image);
    let headers: any = this.getHttpHeaders();
    headers['framewidth'] = `${width}`;
    headers['frameheight'] = `${height}`;
    headers['framechannels'] = '3';

    const options: any = { responseType: 'text', headers: new HttpHeaders(headers) };
    return this.http.post(`${this.targetUrl}/video`, payload, options);
  }

  getState() {
    return this.http.get(`${this.targetUrl}/state`, {responseType: 'text'});
  }

  private getName() {
    this.http.get(`${this.targetUrl}/name`, {responseType: 'text'})
      .subscribe((res) => {
        this.botName = res;
        this.botName$.next(this.botName);
      });
  }

  private getPrompt() {
    this.http.get(`${this.targetUrl}/prompt`, {responseType: 'text'})
      .subscribe((res) => {
        this.prompt = this.store.getItem('prompt') !== null ? this.store.getItem('prompt') : res;
        this.prompt$.next(this.prompt);
      });
  }

  private getPrompts() {
    this.http.get(`${this.targetUrl}/prompts`)
      .subscribe((res) => {
        let prompts = res as string[];
        if (JSON.stringify(this.prompts) !== JSON.stringify(prompts)) {
          this.prompts = prompts;
          this.prompts$.next(this.prompts);
        }
      });
  }

  private getModel() {
    this.http.get(`${this.targetUrl}/model`, {responseType: 'text'})
      .subscribe((res) => {
        this.model = this.store.getItem('model') !== null ? this.store.getItem('model') : res;
        this.model$.next(this.model);
      });
  }

  private getModels() {
    this.http.get(`${this.targetUrl}/models`)
      .subscribe((res) => {
        let models = res as string[];
        if (JSON.stringify(this.prompts) !== JSON.stringify(models)) {
          this.models = models;
          this.models$.next(this.models);
        }
      });
  }

  frameDecode(buffer: ArrayBuffer, decodedData: any, callback: Function) {
    while (buffer.byteLength > 0) {
      try {
        let chunkHeader = new TextDecoder().decode(buffer.slice(0, 3));
        if (['TIM', 'SPK', 'REQ', 'ANS', 'PCM', 'IMG'].indexOf(chunkHeader) === -1) {
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

          // @ts-ignore
          if (chunkHeader === 'REQ' || chunkHeader === 'SPK') {
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
          } else if (chunkHeader === 'IMG') {
            decodedData['IMG'] = chunkContent;
            callback(decodedData);
          }
        }
      } catch (e) {
        break;
      }
    }
    return buffer;
  }

  concatenateArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }
}
