import { Component, ViewChild } from '@angular/core';
import { MediaService } from '../services/media.service';
import { ElectronService } from '../services/electron.service';
import { VideoInputService } from '../services/video-input.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-video-feedback',
  templateUrl: './video-feedback.component.html',
  styleUrls: ['./video-feedback.component.css']
})
export class VideoFeedbackComponent {
  @ViewChild('video') videoElement: any;

  constructor(private videoInput: VideoInputService, private electron: ElectronService, private media: MediaService,
              private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Video feedback');
  }

  ngAfterViewInit() {
    if (this.electron.isElectronApp) {
      this.electron.bind('video-stream-received', (event: Object, deviceId: string) => {
        this.media.getDeviceStream(deviceId, 'video')
          .then((stream) => {
              this.videoElement.nativeElement.srcObject = null;
              this.videoElement.nativeElement.srcObject = stream;
          });
      });
    } else {
      this.videoInput.stream$.subscribe((stream) => {
        if (stream !== undefined) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      });
    }
  }
}
