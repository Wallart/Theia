import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private ipc: IpcRenderer | undefined;

  constructor() {
    if ((<any>window).require) {
      try {
        this.ipc = (<any>window).require('electron').ipcRenderer;
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

  public get isElectronApp(): boolean {
    return !!window.navigator.userAgent.match(/Electron/);
  }
}
