import { Router } from '@angular/router';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';
import { AudioSinkService } from '../../services/audio-sink.service';
import { AudioInputService } from '../../services/audio-input.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { VideoInputService } from '../../services/video-input.service';

@Component({
  selector: 'bottom-bar',
  templateUrl: './bottom-bar.component.html',
  styleUrls: ['./bottom-bar.component.css']
})
export class BottomBarComponent {
  @ViewChild('speechBars') speechBars: any;
  @ViewChild('messageInput') messageInput: any;
  @ViewChild('messageTextarea') messageTextarea: any;

  message: string = '';
  username: string = '';

  clearShortcut: string = '';
  toggleCamShortcut: string = '';
  toggleMicShortcut: string = '';
  toggleSpeakersShortcut: string = '';
  gearShortcut: string = '';

  isMultiline: boolean = false;
  cameraMuted: boolean;
  microphoneMuted: boolean;
  speakersMuted: boolean;

  constructor(private electron: ElectronService, private chat: ChatService, private hyperion: HyperionService,
              private audioSink: AudioSinkService, private audioInput: AudioInputService, private router: Router,
              private store: LocalStorageService, private videoInput: VideoInputService, private changeDetectorRef: ChangeDetectorRef) {
    this.microphoneMuted = this.audioInput.muted;
    this.speakersMuted = this.audioSink.muted;
    this.cameraMuted = this.videoInput.muted;

    this.electron.bind('keymap', (event: Object, keymap: Object) => {
      for(let key in keymap) {
        const attribute = `${key}Shortcut`;
        // @ts-ignore
        if (attribute in this) this[attribute] = keymap[key];
      }
    });

    this.electron.bind('clear', (event: Object) => {
      console.log(`Keyboard shortcut : clear`);
      this.onClear();
    });
    this.electron.bind('toggleCam', (event: Object) => {
      console.log(`Keyboard shortcut : toggleCam`);
      this.toggleCam();
      this.changeDetectorRef.detectChanges();
    });
    this.electron.bind('toggleMic', (event: Object) => {
      console.log(`Keyboard shortcut : toggleMic`);
      this.toggleMic();
      this.changeDetectorRef.detectChanges();
    });
    this.electron.bind('toggleSpeakers', (event: Object) => {
      console.log(`Keyboard shortcut : toggleSpeakers`);
      this.toggleSpeakers();
      this.changeDetectorRef.detectChanges();
    });
    this.electron.bind('gear', (event: Object) => {
      console.log(`Keyboard shortcut : gear`);
      this.onGear();
    });
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

  toggleCam() {
    this.cameraMuted = !this.cameraMuted;
    if (this.cameraMuted) {
      if (this.electron.isElectronApp) {
        this.electron.send('close-video');
      } else {
        this.videoInput.closeCamera();
      }
    } else {
      if (this.electron.isElectronApp) {
        this.electron.send('open-video');
      } else {
        this.router.navigate(['/video']);
        this.videoInput.openCamera();
      }
    }
  }

  onSend() {
    let message = this.message;
    if (message === '') return;
    let username = this.username;
    if (username === '') {
      username = 'Unknown';
    }

    this.message = '';
    this.chat.addUserMsg(username, message, new Date());
    this.hyperion.sendChat(username, message)
      .then(subject => {
        subject.subscribe((frame) => {
          let answer = this.chat.formatAnswerWithRequest(frame['ANS'], frame['REQ']);
          this.chat.addBotMsg(answer, frame['TIM']);
          this.audioSink.setBuffer(frame['PCM'], frame['TIM']);
          this.chat.addBotImg(frame['IMG'], frame['TIM']);
        });
      });
  }

  onPrevious() {
    let lastMsg = this.chat.getLastUserMsg();
    if (lastMsg !== null && this.message === '') {
      let pastMessages = lastMsg.content.join(' ');
      this.message = pastMessages;
      setTimeout(() => {
        this.messageInput.nativeElement.setSelectionRange(pastMessages.length, pastMessages.length);
      },50);
    }
  }

  switchMultiline() {
    let cursorPosition = 0;
    if (!this.isMultiline) {
      cursorPosition = this.messageInput.nativeElement.selectionStart;
      this.isMultiline = true;
      // Because Textarea not yet loaded
      setTimeout(() => {
        this.messageTextarea.nativeElement.focus();
        this.updateTextarea(cursorPosition);
      }, 100);
    } else {
      cursorPosition = this.messageTextarea.nativeElement.selectionStart;
      this.updateTextarea(cursorPosition);
    }
  }

  updateTextarea(cursorPosition: number) {
    const textarea = this.messageTextarea.nativeElement;
    this.message = this.message.slice(0, cursorPosition) + '\n' + this.message.slice(cursorPosition);
    this.adjustTextareaHeight();
    this.autoScroll();
    // Wait for text rendering
    setTimeout(() => textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1), 10);
  }

  switchMonoline() {
    this.isMultiline = false;
    setTimeout(() => this.messageInput.nativeElement.focus(), 100);
  }

  adjustTextareaHeight() {
    const textarea = this.messageTextarea.nativeElement;
    textarea.style.height = 'auto'; // Réinitialiser la hauteur pour calculer
    textarea.style.height = textarea.scrollHeight + 'px'; // Ajuster à la hauteur de défilement
  }

  autoScroll() {
    const textarea = this.messageTextarea.nativeElement;
    setTimeout(() => textarea.scrollTop = textarea.scrollHeight, 20); // Défilez vers le bas dans le textarea
  }

  onKeydown(event: KeyboardEvent) {
    if (event.shiftKey && event.key === 'Enter') {
      // For <input>
      event.preventDefault(); // Évite de soumettre le formulaire
      this.switchMultiline();
    } else if (!event.shiftKey && event.key === 'Enter' && this.isMultiline) {
      // For <textarea>
      this.onSend();
      this.switchMonoline();
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      if (this.isMultiline) {
        setTimeout(() => {
          this.adjustTextareaHeight();
          // Vérifier si le contenu a une seule ligne
          if (this.message === '' || this.messageTextarea.nativeElement.scrollHeight <= this.messageTextarea.nativeElement.clientHeight) {
            this.switchMonoline();
          }
        }, 10);
      }
    }
  }
}
