import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root'
})
export class HyperionService {
  botName: string;
  targetUrl: string;

  constructor(private http: HttpClient, private electron: ElectronService) {
    this.botName = '';
    if (electron.isElectronApp) {
      this.targetUrl = 'http://deepbox:6450';
    } else {
      this.targetUrl = 'http://localhost:4200/api';
    }
    this.getName().subscribe((response) => {
      this.botName = response as string;
    });
  }

  send(user: string, message: string) {
    const payload = new FormData();
    payload.append('user', user);
    payload.append('message', message);

    // TODO Fix SID
    const httpOptions = {
      responseType: 'arraybuffer',
      headers: new HttpHeaders({
        SID: 'toto'
      })
    };

    // @ts-ignore
    return this.http.post(`${this.targetUrl}/chat`, payload, httpOptions);
  }

  getName() {
    return this.http.get(`${this.targetUrl}/name`, {responseType: 'text'});
  }

  getPrompt() {
    return this.http.get(`${this.targetUrl}/prompt`);
  }

  getPrompts() {
    return this.http.get(`${this.targetUrl}/prompts`);
  }

  getModel() {
    return this.http.get(`${this.targetUrl}/model`);
  }

  getModels() {
    return this.http.get(`${this.targetUrl}/models`);
  }

  frameDecode(buffer: ArrayBuffer, decodedData: any, callback: Function) {
    while (buffer.byteLength > 0) {
      try {
        let chunkHeader = new TextDecoder().decode(buffer.slice(0, 3));
        if (chunkHeader !== 'TIM' && chunkHeader !== 'REQ' && chunkHeader !== 'ANS' && chunkHeader !== 'PCM') {
          break;
        }

        if (chunkHeader === 'TIM') {
          decodedData['TIM'] = new DataView(buffer.slice(3, 11)).getFloat64(0, true);
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
