import { from } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class HyperionService {
  model: string = '';
  models: string[] = [];
  prompt: string = '';
  prompts: string[] = [];
  botName: string = '';
  targetUrl: string;
  sid: string = 'toto';

  constructor(private http: HttpClient, private electron: ElectronService) {
    if (electron.isElectronApp) {
      this.targetUrl = 'http://deepbox:6450';
    } else {
      this.targetUrl = 'http://localhost:4200/api';
    }
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
      return from(this.prompts);
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
      return from(this.models);
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
