import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  speakers: any;
  microphones: any;
  cameras: any;

  constructor() {
    this.speakers = [];
    this.microphones = [];
    this.cameras = [];
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices.forEach((device) => {
          console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
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
}
