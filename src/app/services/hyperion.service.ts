import { from, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { StatusService } from './status.service';
import { ElectronService } from './electron.service';
import { AudioSinkService } from './audio-sink.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
              private sink: AudioSinkService, private router: Router, private status: StatusService) {
    let rootUrl;
    if (electron.isElectronApp) {
      rootUrl = 'deepbox:6450';
      this.targetUrl = `http://${rootUrl}`;
    } else {
      rootUrl = 'localhost:4200';
      this.targetUrl = `http://${rootUrl}/api`;
    }

    if (!this.electron.isElectronApp || this.router.url === '/') {
      this.socket = io(`ws://${rootUrl}`);
      this.socket.on('connect', () => this.onConnect());
      this.socket.on('disconnect', () => this.onDisconnect());
      this.socket.on('error', (err: any) => this.onError(err));
      this.socket.on('interrupt', (timestamp: number) => this.onInterrupt(timestamp));
    }

    this.getState().subscribe((res) => this.status.online());
  }

  onInterrupt(timestamp: number) {
    this.sink.interrupt(new Date(timestamp * 1000));
  }

  onConnect() {
    this.sid = this.socket.id;
    console.log(`WebSocket connected with sid : ${this.sid}`);
    this.status.online();
  }

  onError(err: any) {
    console.error(err);
  }

  onDisconnect() {
    console.warn('WebSocket connection lost');
    this.status.offline();
  }

  private getHttpHeaders() {
    return {
      SID: this.sid,
      model: this.model,
      preprompt: this.prompt,
      silent: this.sink.muted.toString()
    };
  }

  drainStream(status: number, reader: any, additional?: any) {
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
        buffer = this.frameDecode(buffer, decodedData, (frame: any) => {
          if (additional !== undefined) {
            frame['SPK'] = additional;
          }
          subject.next(frame);
        });

        reader?.read().then(pump);
      };

      reader?.read().then(pump);
    } else if (status === 418) {
      this.status.sleeping();
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
      .then(res => this.drainStream(res.status, res.body?.getReader(), res.headers.get('speaker')));
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

  concatenateArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }
}
