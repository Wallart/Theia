import { Router } from '@angular/router';
import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';
import { AudioSinkService } from '../../services/audio-sink.service';
import { AudioInputService } from '../../services/audio-input.service';

@Component({
  selector: 'bottom-bar',
  templateUrl: './bottom-bar.component.html',
  styleUrls: ['./bottom-bar.component.css']
})
export class BottomBarComponent {
  @ViewChild('message') message: any;
  @ViewChild('username') username: any;

  microphoneMuted: boolean;
  speakersMuted: boolean;

  constructor(private electron: ElectronService, private chat: ChatService, private hyperion: HyperionService,
              private audioSink: AudioSinkService, private audioInput: AudioInputService, private router: Router) {
    this.microphoneMuted = this.audioInput.muted;
    this.speakersMuted = this.audioSink.muted;
  }

  onClear() {
    this.chat.clear();
  }

  onGear() {
    if (this.electron.isElectronApp) {
      this.electron.send('open-settings');
    } else {
      this.router.navigate(['/settings'])
    }
  }

  toggleMic() {
    this.microphoneMuted = !this.microphoneMuted;
    if (!this.microphoneMuted) {
      this.audioInput.openMicrophone();
    } else {
      this.audioInput.closeMicrophone();
    }
  }

  toggleSpeakers() {
    this.speakersMuted = !this.speakersMuted;
    if (this.speakersMuted) {
      this.audioSink.mute();
    } else {
      this.audioSink.unmute();
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
        this.audioSink.setBuffer(frame['PCM'], frame['TIM']);
      });
    });
  }
}
