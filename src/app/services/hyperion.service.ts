import { io } from 'socket.io-client';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { IndexService } from './index.service';
import { StatusService } from './status.service';
import { ElectronService } from './electron.service';
import { BehaviorSubject, from, Subject } from 'rxjs';
import { AudioSinkService } from './audio-sink.service';
import { LocalStorageService } from './local-storage.service';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HyperionService {
  version = require('../../../package.json').version;
  socket: any;
  secret: string = '';
  serviceTokens = ['<ACK>', '<MEMWIPE>', '<SLEEPING>', '<WAKE>', '<CONFUSED>', '<ERR>', '<CMD>', '<DOCOK>', '<DOCNOK>'];

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
  indexes: string[] = [];
  pushedData$ = new Subject<any>();

  speechEngines: string[] = [];
  speechEngines$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(this.speechEngines);
  selectedSpeechEngine: string = '';
  selectedSpeechEngine$: BehaviorSubject<string> = new BehaviorSubject<string>(this.selectedSpeechEngine);
  voices: string[] = [];
  voices$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(this.voices);
  selectedVoice: string = '';
  selectedVoice$: BehaviorSubject<string> = new BehaviorSubject<string>(this.selectedVoice);

  rootUrl: string = '';
  targetUrl: string = '';
  socketUrl: string = '';
  sid: string = '';

  constructor(private http: HttpClient, private electron: ElectronService, private sink: AudioSinkService,
              private router: Router, private status: StatusService, private store: LocalStorageService, private indices: IndexService) {
    this.address = this.store.getItem('serverAddress') === null ? 'localhost:6450' : this.store.getItem('serverAddress');
    this.electron.getSecret().then(res => {
      this.secret = res;
      this.start();
    });

    if (this.electron.isElectronApp) {
      this.electron.bind('address-changed', (event: Object, address: string) => {
        this.disconnectSocket();
        this.address = address;
        this.connectSocket();
      });
      this.electron.bind('voice-changed', (event: Object, args: any) => this.setVoice(args[0], args[1]));
      this.electron.bind('voice-engines-changed', (event: Object, preferredEngines: any) => this.setSpeechEngines(preferredEngines));
      this.electron.bind('voice-settings-requested', (event: Object) => this.notifySettingsWindow());
    }
  }

  start() {
    if (!this.electron.isElectronApp || this.router.url === '/') {
      this.connectSocket();
    }
  }

  notifySettingsWindow() {
    this.electron.send('voice-settings-change', {
      'speechEngines': this.speechEngines,
      'selectedEngine': this.selectedSpeechEngine,
      'voices': this.voices,
      'selectedVoice': this.selectedVoice
    });
  }

  pollChanges() {
    this.getModels();
    this.getPrompts();
    this.listIndexes();
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
    this.socket.on('data', (frame: any) => this.onData(frame));
  }

  disconnectSocket() {
    if (this.socket !== undefined) {
      this.socket.disconnect();
    }
  }

  onInterrupt(timestamp: number) {
    this.sink.interrupt(new Date(timestamp * 1000));
  }

  onData(buffer: any) {
    this.frameDecode(buffer, (frame: any) => this.pushedData$.next(frame));
  }

  onConnect() {
    this.sid = this.socket.id;
    console.log(`WebSocket connected with sid : ${this.sid}`);
    this.socket.emit('identify', this.store.getItem('appIdentifier'));
    this.status.online();
    this.getPrompt();
    this.getPrompts();
    this.getModel();
    this.getModels();
    this.getName();
    this.getSpeechSynthesizerDetails();
    this.listIndexes();
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
      secret: this.secret,
      indexes: this.indexes,
      version: this.version,
      preprompt: this.prompt,
      silent: this.sink.muted.toString(),
    };
  }

  drainStream(status: number, reader: any) {
    const subject = new Subject<any>();
    if (status === 200) {
      this.status.online();
      this.status.addPendingResponse();
      let buffer = new Uint8Array(0).buffer;
      const pump = (data: any) => {
        const {done, value} = data;
        if (done) {
          if (buffer.byteLength > 0) console.error('Orphan data in buffer.');
          this.status.removePendingResponse();
          return;
        }

        buffer = this.concatenateArrayBuffers(buffer, value.buffer);
        buffer = this.frameDecode(buffer, (frame: any) => subject.next(frame));

        reader?.read().then(pump);
      };

      reader?.read().then(pump);
    } else if (status === 418) {
      this.status.sleeping();
    } else if(status === 204) {
      this.status.confused();
    } else if (status === 401) {
      this.status.custom('Unauthorized');
    } else if (status === 426) {
      this.status.custom('Upgrade required');
    } else {
      this.status.custom(`Unknown ${status}`);
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

  sendFileToContext(file: File) {
    const payload = new FormData();
    payload.append('file', file, file.name);

    const options: any = {
      method: 'POST',
      body: payload,
      responseType: 'text',
      headers: this.getHttpHeaders()
    }
    return this.http.post(`${this.targetUrl}/upload-to-context`, payload, options);
  }

  sendFilesToIndex(files: File[], indexName: string) {
    const payload = new FormData();
    for (let file of files) {
      payload.append(file.name, file, file.name);
    }

    const options: any = {
      method: 'POST',
      body: payload,
      responseType: 'text',
      headers: this.getHttpHeaders()
    }
    return this.http.post(`${this.targetUrl}/index/${indexName}/upload`, payload, options);
  }

  listIndexes() {
    return this.http.get(`${this.targetUrl}/indexes`, {headers: this.getHttpHeaders()})
      .subscribe((res: any) => this.indices.updateIndices(res));
  }

  createIndex(indexName: string) {
    return this.http.post(`${this.targetUrl}/index/${indexName}`, {}, {responseType: 'text', headers: this.getHttpHeaders()});
  }

  listDocuments(indexName: string) {
    return this.http.get(`${this.targetUrl}/index/${indexName}/documents`, {headers: this.getHttpHeaders()});
  }

  // queryIndex(indexName: string, query: string) {
  //   let params = new HttpParams();
  //   params = params.append('value', query);
  //   return this.http.get(`${this.targetUrl}/index/${indexName}/query`, {params});
  // }

  deleteIndex(indexName: string) {
    return this.http.delete(`${this.targetUrl}/index/${indexName}`, {responseType: 'text', headers: this.getHttpHeaders()});
  }

  deleteInIndex(indexName: string, docId: string) {
    return this.http.delete(`${this.targetUrl}/index/${indexName}/documents/${docId}`, {responseType: 'text', headers: this.getHttpHeaders()});
  }

  getState() {
    return this.http.get(`${this.targetUrl}/state`, {responseType: 'text', headers: this.getHttpHeaders()});
  }

  getMemoryState() {
    return this.http.get(`${this.targetUrl}/index/state`, {responseType: 'text', headers: this.getHttpHeaders()});
  }

  private getName() {
    this.http.get(`${this.targetUrl}/name`, {responseType: 'text', headers: this.getHttpHeaders()})
      .subscribe((res) => {
        this.botName = res;
        this.botName$.next(this.botName);
      });
  }

  private getPrompt() {
    this.http.get(`${this.targetUrl}/prompt`, {responseType: 'text', headers: this.getHttpHeaders()})
      .subscribe((res) => this.prompt$.next(res));
  }

  public getPrompts() {
    this.http.get(`${this.targetUrl}/prompts`, {headers: this.getHttpHeaders()})
      .subscribe((res) => {
        let prompts = res as string[];
        if (JSON.stringify(this.prompts) !== JSON.stringify(prompts)) {
          this.prompts = prompts;
          this.prompts$.next(this.prompts);
        }
      });
  }

  public deletePrompt(promptName: string) {
    return this.http.delete(`${this.targetUrl}/prompt/${promptName}`, {responseType: 'text' as 'json', headers: this.getHttpHeaders()})
  }

  public uploadPrompts(prompts: File[]) {
    let payload = new FormData();
    for (let prompt of prompts) {
      let castedPrompt = new File([prompt], prompt.name, { type: 'text/plain' });
      payload.append(castedPrompt.name, castedPrompt, castedPrompt.name);
    }
    return this.http.post(`${this.targetUrl}/prompts`, payload, {responseType: 'text' as 'json', headers: this.getHttpHeaders()});
  }

  public readPrompt(prompt: string) {
    return this.http.get(`${this.targetUrl}/prompt/${prompt}`, {responseType: 'text' as 'json', headers: this.getHttpHeaders()});
  }

  private getModel() {
    this.http.get(`${this.targetUrl}/model`, {responseType: 'text', headers: this.getHttpHeaders()})
      .subscribe((res) => this.model$.next(res));
  }

  private getModels() {
    this.http.get(`${this.targetUrl}/models`, {headers: this.getHttpHeaders()})
      .subscribe((res) => {
        let models = res as string[];
        if (JSON.stringify(this.prompts) !== JSON.stringify(models)) {
          this.models = models;
          this.models$.next(this.models);
        }
      });
  }

  private getSpeechSynthesizerDetails() {
    this.getSpeechEngines().subscribe((engines: any) => {
      this.speechEngines = engines;
      this.speechEngines$.next(this.speechEngines);

      this.selectedSpeechEngine = engines[0];
      this.selectedSpeechEngine$.next(this.selectedSpeechEngine);

      this.getVoices(engines[0]).subscribe((voices: any) => {
        this.voices = voices;
        this.voices$.next(this.voices);

        this.getVoice(engines[0]).subscribe((voice: any) => {
          this.selectedVoice = voice;
          this.selectedVoice$.next(this.selectedVoice);
          this.notifySettingsWindow();
        });
      });
    });
  }

  private getSpeechEngines() {
    return this.http.get(`${this.targetUrl}/tts-preferred-engines`, {headers: this.getHttpHeaders()});
  }

  setSpeechEngines(enginesOrder: string[]) {
    this.selectedSpeechEngine = enginesOrder[0];
    // Send as JSON
    return this.http.put(`${this.targetUrl}/tts-preferred-engines`, enginesOrder, {responseType: 'text' as 'json', headers: this.getHttpHeaders()})
      .subscribe(() => {
        this.getVoices(enginesOrder[0]).subscribe((voices: any) => {
          this.voices = voices;
          this.voices$.next(this.voices);
          this.getVoice(enginesOrder[0]).subscribe((voice: any) => {
            this.selectedVoice = voice;
            this.selectedVoice$.next(this.selectedVoice);
            this.notifySettingsWindow();
          });
        });
      });
  }

  private getVoices(selectedEngine: string) {
    let params = new HttpParams();
    params = params.append('engine', selectedEngine);
    return this.http.get(`${this.targetUrl}/voices`, {params, headers: this.getHttpHeaders()});
  }

  private getVoice(selectedEngine: string) {
    let params = new HttpParams();
    params = params.append('engine', selectedEngine);
    return this.http.get(`${this.targetUrl}/voice`, {responseType: 'text' as 'json', params, headers: this.getHttpHeaders()});
  }

  setVoice(selectedEngine: string, selectedVoice: string) {
    this.selectedVoice = selectedVoice;
    const payload = new FormData();
    payload.append('engine', selectedEngine);
    payload.append('voice', selectedVoice);
    return this.http.put(`${this.targetUrl}/voice`, payload, {responseType: 'text' as 'json', headers: this.getHttpHeaders()}).subscribe();
  }

  frameDecode(buffer: ArrayBuffer, callback: Function) {
    let cursor = 0;
    let decodedData: any = {};
    const validHeaders = ['TIM', 'SPK', 'REQ', 'IDX', 'ANS', 'PCM', 'IMG'];

    while (cursor < buffer.byteLength) {
      try {
        let chunkHeader = new TextDecoder().decode(buffer.slice(cursor, cursor + 3));
        cursor += 3;
        if (validHeaders.indexOf(chunkHeader) === -1) {
          console.error('Invalid header');
          break;
        }

        if (chunkHeader === 'TIM') {
          const timestamp = new DataView(buffer.slice(cursor, cursor + 8)).getFloat64(0, true);
          decodedData['TIM'] = new Date(timestamp * 1000);
          cursor += 8;
        } else {
          let chunkSize = new DataView(buffer.slice(cursor)).getInt32(0);
          cursor += 4;
          let chunkContent: any = buffer.slice(cursor, cursor + chunkSize);

          if (chunkContent.byteLength < chunkSize) {
            console.warn('Date frame is not complete');
            break;
          }

          cursor += chunkSize;
          if (chunkHeader === 'REQ' || chunkHeader === 'SPK') {
            chunkContent = new TextDecoder().decode(chunkContent);
            decodedData[chunkHeader] = chunkContent;
          } else if(chunkHeader === 'ANS') {
            decodedData['IDX'] = new DataView(chunkContent).getInt8(0);
            chunkContent = new TextDecoder().decode(chunkContent.slice(1));
            decodedData[chunkHeader] = chunkContent;
          } else if (chunkHeader === 'PCM' || chunkHeader === 'IMG') {
            decodedData[chunkHeader] = chunkContent;
          }

          if (validHeaders.toString() === Object.keys(decodedData).toString()) {
            this.decodedFilter(decodedData, callback);
            // Remove consumed data
            decodedData = {};
            buffer = buffer.slice(cursor);
            cursor = 0;
          }
        }
      } catch (e) {
        console.error(`Error occurred during frameDecode : ${e}`);
        break;
      }
    }

    return buffer;
  }

  decodedFilter(decodedData: any, callback: Function) {
    switch (decodedData['ANS']) {
      case this.serviceTokens[0]:
        this.status.online();
        // don't forward ACK
        return;
      case this.serviceTokens[2]:
        this.status.sleeping();
        break;
      case this.serviceTokens[3]:
        this.status.online();
        break;
      case this.serviceTokens[4]:
        this.status.confused();
        break;
    }
    callback(decodedData);
  }

  concatenateArrayBuffers(buffer1: ArrayBuffer, buffer2: ArrayBuffer) {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  }
}
