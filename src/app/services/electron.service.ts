import { Injectable } from '@angular/core';
import { IpcRenderer, Clipboard } from 'electron';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private ipc: IpcRenderer | undefined;
  private clipboard: Clipboard | undefined;

  constructor() {
    if ((<any>window).require) {
      try {
        this.ipc = (<any>window).require('electron').ipcRenderer;
        this.clipboard = (<any>window).require('electron').clipboard;
      } catch (error) {
        throw error;
      }
    }
  }

  public send(channel: string, ...args: any[]): void {
    if (!this.ipc) {
      return;
    }
    this.ipc.send(channel, ...args);
  }

  public bind(eventName: string, func: any) {
    if (!this.ipc) {
      return;
    }
    this.ipc.on(eventName, func);
  }

  public writeToClipboard(text: string) {
    if (!this.clipboard) {
      return;
    }
    this.clipboard.writeText(text);
  }

  public get isElectronApp(): boolean {
    return !!window.navigator.userAgent.match(/Electron/);
  }
}
