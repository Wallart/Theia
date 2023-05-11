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
    this.pollDevices();
  }

  pollDevices() {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        let cameras = [];
        let speakers = [];
        let microphones = [];

        for (const device of devices) {
          // console.log(device.kind + ': ' + device.label + ' id = ' + device.deviceId);
          if (device.kind === 'videoinput') {
            cameras.push(device);
          } else if (device.kind === 'audioinput') {
            microphones.push(device);
          } else {
            speakers.push(device);
          }
        }

        if (JSON.stringify(cameras) !== JSON.stringify(this.cameras)) {
          this.cameras = cameras;
          this.cameras$.next(this.cameras);
        }
        if (JSON.stringify(speakers) !== JSON.stringify(this.speakers)) {
          this.speakers = speakers;
          this.speakers$.next(this.speakers);
        }
        if (JSON.stringify(microphones) !== JSON.stringify(this.microphones)) {
          this.microphones = microphones;
          this.microphones$.next(this.microphones);
        }

        // Update devices availability after 1s.
        setTimeout(() => this.pollDevices(), 1000);
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
