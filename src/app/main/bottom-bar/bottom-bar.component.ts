import { Router } from '@angular/router';
import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';
import { AudioSinkService } from '../../services/audio-sink.service';
import { AudioInputService } from '../../services/audio-input.service';
import {LocalStorageService} from "../../services/local-storage.service";

@Component({
  selector: 'bottom-bar',
  templateUrl: './bottom-bar.component.html',
  styleUrls: ['./bottom-bar.component.css']
})
export class BottomBarComponent {
  @ViewChild('speechBars') speechBars: any;

  message: string = '';
  username: string = '';

  microphoneMuted: boolean;
  speakersMuted: boolean;

  constructor(private electron: ElectronService, private chat: ChatService, private hyperion: HyperionService,
              private audioSink: AudioSinkService, private audioInput: AudioInputService, private router: Router,
              private store: LocalStorageService) {
    this.microphoneMuted = this.audioInput.muted;
    this.speakersMuted = this.audioSink.muted;
  }

  ngOnInit() {
    let username = this.store.getItem('username');
    if (username !== null && username.length > 0) {
      this.username = username;
    }
  }

  ngAfterViewInit() {
    this.audioInput.speaking$.subscribe((event) => this.onSpeechEvent(event));
  }

  onSpeechEvent(speaking: boolean) {
    const bars = this.speechBars.nativeElement;
    if (speaking) {
      bars.setAttribute('class', '');
    } else {
      bars.setAttribute('class', 'hidden-bars');
    }
  }

  onUsernameChanged() {
    if (this.username.length > 0) {
      const regex = /[a-zA-Z0-9_-]{1,64}/g;
      // @ts-ignore
      this.username = this.username.match(regex).join('');
    }
    this.store.setItem('username', this.username);
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

  onSend() {
    let message = this.message;
    let username = this.username;
    if (username === '') {
      username = 'Unknown';
    }

    this.message = '';
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
