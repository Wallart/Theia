import { encrypt } from '../../crypto';
import { Injectable } from '@angular/core';
import { IpcRenderer, Clipboard } from 'electron';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {

  private os: any;
  // private fs: any;
  private ipc: IpcRenderer | undefined;
  private clipboard: Clipboard | undefined;
  private rawSecret: string = '582b3d20-8810-435b-a2f1-c64b40c13e21';

  constructor() {
    if ((<any>window).require) {
      try {
        // require nodeIntegration: true in electron
        this.ipc = (<any>window).require('electron').ipcRenderer;
        this.clipboard = (<any>window).require('electron').clipboard;
        this.os = window.require('os');
        // this.fs = window.require('fs');
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

  public get isMac(): boolean {
    return this.os.platform() === 'darwin';
  }

  public get isWindows(): boolean {
    return this.os.platform() === 'win32';
  }

  public get isLinux(): boolean {
    return this.os.platform() === 'linux';
  }

  // public getFile(path: string): string {
  //   return this.fs.readFileSync(path, 'utf8');
  // }

  public async getPublicKey() {
    let res = await fetch('assets/public_key.pem');
    return await res.text();
  }

  public async getSecret(): Promise<string> {
    const publicKey = await this.getPublicKey();
    return await encrypt(publicKey, this.rawSecret);
  }
}
