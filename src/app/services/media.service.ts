import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  cameras: any[] = [];
  speakers: any[] = [];
  microphones: any[] = [];

  cameras$ = new BehaviorSubject<any[]>(this.microphones);
  speakers$ = new BehaviorSubject<any[]>(this.speakers);
  microphones$ = new BehaviorSubject<any[]>(this.cameras);

  constructor() {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        for (const device of devices) {
          // console.log(device.kind + ': ' + device.label + ' id = ' + device.deviceId);
          if (device.kind === 'videoinput') {
            this.cameras.push(device);
          } else if (device.kind === 'audioinput') {
            this.microphones.push(device);
          } else {
            this.speakers.push(device);
          }
        }

        this.microphones$.next(this.microphones);
        this.speakers$.next(this.speakers);
        this.cameras$.next(this.cameras);
      });
  }

  getDeviceId(deviceName: string, deviceType: string) {
    let devices: any;
    if (deviceType === 'audioinput') {
      devices = this.microphones;
    } else if (deviceType === 'audiooutput') {
      devices = this.speakers;
    } else {
      devices = this.cameras;
    }
    for(const device of devices) {
      if (device.label === deviceName || deviceName.indexOf(device.label) > -1) {
        if (device.deviceId === 'default') {
          continue;
        }
        return device.deviceId;
      }
    }
    return null;
  }

  getDeviceStream(deviceId: any, deviceType: string) {
    const constraints: any = {};
    constraints[deviceType] = { deviceId: deviceId };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  getVideoStream(streamId: any) {
    const constraints: any = { video: { mediaSource: streamId }, audio: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  }
}
