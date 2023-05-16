import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { MediaService } from './media.service';
import { ElectronService } from './electron.service';
import { HyperionService } from './hyperion.service';
import { LocalStorageService } from './local-storage.service';

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
  selectedCamera$: BehaviorSubject<string> = new BehaviorSubject<string>(this.selectedCamera);
  stream$: BehaviorSubject<any> = new BehaviorSubject<any>(this.stream);

  constructor(private media: MediaService, private electron: ElectronService, private hyperion: HyperionService,
              private store: LocalStorageService, private router: Router) {
    this.media.cameras$.subscribe((data) => {
      if (data.length > 0) {
        let label = data[0].label;
        let deviceId = data[0].deviceId;
        if (this.store.getItem('camera') !== null) {
          label = this.store.getItem('camera');
          deviceId = this.media.getDeviceId(label, 'videoinput');
          if (deviceId === null) label = data[0].label;
        }

        if (this.selectedCamera !== label) {
          this.selectedCamera = label;
          this.selectedCamera$.next(label);
        }
      }
    });

    this.electron.bind('cam-device-changed', (event: Object, device: string) => {
      console.log(`Camera device changed to ${device}`);
      this.currCamera = device;
    });
  }

  openCamera() {
    if (this.electron.isElectronApp && this.router.url !== '/') return;

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

  // captureFrame() {
  //   if (this.stream !== undefined && this.stream?.active) {
  //     this.capture.takePhoto()
  //       .then((imageBlob: Blob) => {
  //         const width = this.capture.track.getSettings().width;
  //         const height = this.capture.track.getSettings().height;
  //         this.hyperion
  //           .sendImage(imageBlob, width, height)
  //           .subscribe((res: any) => {
  //             this.captureTimeout = setTimeout(() => this.captureFrame(), this.timeout);
  //           });
  //       })
  //       .catch(console.error);
  //   }
  // }

  captureFrame() {
    if (this.stream !== undefined && this.stream?.active) {
      this.capture.grabFrame()
        .then((imageBitmap: ImageBitmap) => {
          const width = this.capture.track.getSettings().width;
          const height = this.capture.track.getSettings().height;

          let canvas = new OffscreenCanvas(width, height);
          // @ts-ignore
          canvas.getContext('bitmaprenderer').transferFromImageBitmap(imageBitmap);
          // @ts-ignore
          canvas.convertToBlob({type: 'image/jpeg', quality: 1.0})
            .then((imageBlob: Blob) => {
              this.hyperion
                .sendImage(imageBlob, width, height)
                .subscribe((res: any) => {
                  this.captureTimeout = setTimeout(() => this.captureFrame(), this.timeout);
                });
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
    this.store.setItem('camera', cameraName);
    if (autostart) {
      this.openCamera();
    }
    this.muted = !autostart;
  }
}
