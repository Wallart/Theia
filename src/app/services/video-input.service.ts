import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { HyperionService } from './hyperion.service';

@Injectable({
  providedIn: 'root'
})
export class VideoInputService {

  muted: boolean = true;
  stream: MediaStream | undefined = undefined;
  capture: any;
  captureTimeout: any;
  timeout = 1000;
  selectedCamera: string = '';
  stream$: BehaviorSubject<any> = new BehaviorSubject<any>(this.stream);

  constructor(private media: MediaService, private electron: ElectronService, private hyperion: HyperionService) {
    this.media.cameras$.subscribe((data) => {
      if (data.length > 0) {
        this.selectedCamera = data[0].label;
      }
    });

    this.electron.bind('cam-device-changed', (event: Object, device: string) => {
      console.log(`Camera device changed to ${device}`);
      this.currCamera = device;
    });
  }

  openCamera() {
    this.muted = false;
    const deviceId = this.media.getDeviceId(this.selectedCamera, 'videoinput')
    this.media.getDeviceStream(deviceId, 'video')
      .then((stream) => {
        this.stream = stream;
        const track = stream.getVideoTracks()[0];
        // @ts-ignore
        this.capture = new ImageCapture(track);
        this.captureTimeout = setTimeout(() => this.captureFrame(), 1000);

        if (this.electron.isElectronApp) {
          this.electron.send('video-stream', deviceId);
        } else {
          this.stream$.next(this.stream);
        }
      })
      .catch(console.error);
  }

  closeCamera() {
    this.muted = true;
    if (this.stream !== undefined) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
  }

  captureFrame() {
    if (this.stream !== undefined && this.stream?.active) {
      this.capture.takePhoto()
        .then((imageBlob: Blob) => {
          const width = this.capture.track.getSettings().width;
          const height = this.capture.track.getSettings().height;
          this.hyperion
            .sendImage(imageBlob, width, height)
            .subscribe((res: any) => {
              this.captureTimeout = setTimeout(() => this.captureFrame(), 1000);
            });
        })
        .catch(console.error);
    }
  }

  set currCamera(cameraName: string) {
    const autostart = !this.muted;
    this.closeCamera();
    delete this.stream;

    this.selectedCamera = cameraName;
    if (autostart) {
      this.openCamera();
    }
    this.muted = !autostart;
  }
}
