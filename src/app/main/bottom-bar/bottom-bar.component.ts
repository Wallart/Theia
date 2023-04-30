import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';
import { AudioSinkService } from '../../services/audio-sink.service';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'bottom-bar',
  templateUrl: './bottom-bar.component.html',
  styleUrls: ['./bottom-bar.component.css']
})
export class BottomBarComponent {
  @ViewChild('message') message: any;
  @ViewChild('username') username: any;

  microphoneMuted: boolean = true;
  speakersMuted: boolean = false;

  constructor(private electron: ElectronService, private chat: ChatService, private hyperion: HyperionService,
              private sink: AudioSinkService, private media: MediaService) {}

  onClear() {
    this.chat.clear();
  }

  onGear() {
    this.electron.send('open-settings');
  }

  toggleMic() {
    this.microphoneMuted = !this.microphoneMuted;
    if (!this.microphoneMuted) {
      this.media.openMicrophone();
    } else {
      this.media.closeMicrophone();
    }
  }

  toggleSpeakers() {
    this.speakersMuted = !this.speakersMuted;
    if (this.speakersMuted) {
      this.sink.mute();
    } else {
      this.sink.unmute();
    }
  }

  onSend(event: any) {
    let message = event.target.value;
    let username = this.username.nativeElement.value;
    if (username === '') {
      username = 'Unknown';
    }

    this.message.nativeElement.value = '';
    this.chat.addUserMsg(username, [message], new Date());
    this.hyperion.sendChat(username, message).subscribe((response: any) => {
      const arrayBuffer = response.body;
      const decodedData = {};
      this.hyperion.frameDecode(arrayBuffer, decodedData, (frame: any) => {
        this.chat.addBotMsg([frame['ANS']], frame['TIM']);
        this.sink.setBuffer(frame['PCM'], frame['TIM']);
      });
    });
  }
}
