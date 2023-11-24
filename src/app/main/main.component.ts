import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { HyperionService } from '../services/hyperion.service';
import { AudioSinkService } from '../services/audio-sink.service';
import { LocalStorageService } from '../services/local-storage.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  @ViewChild('container') container: any;
  stickyPos = 0.75;
  lastHeight = 0;
  initialScrollDone = false;
  botName = '';

  constructor(private chat: ChatService, private hyperion: HyperionService,
              private store: LocalStorageService, private audioSink: AudioSinkService) {
    this.hyperion.botName$.subscribe((name) => this.botName = name);
  }

  ngAfterViewChecked() {
    const element = this.container.nativeElement.getElementsByTagName('chat-history')[0];
    if (this.lastHeight !== element.scrollHeight) {
      console.log('Change detected');
      this.lastHeight = element.scrollHeight;
      if (this.initialScrollDone) {
        const scrollHeight = element.scrollHeight;
        const percentPos = (element.getBoundingClientRect().height + element.scrollTop) / scrollHeight;
        if (percentPos >= this.stickyPos || (this.botName !== '' && !this.chat.isLastSpeaker(this.botName))) {
          element.scrollTop = scrollHeight;
        }
      } else {
        this.initialScrollDone = true;
        setTimeout(() => element.scrollTop = element.scrollHeight, 500);
      }
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    // @ts-ignore
    const files = event.dataTransfer.files;
    const reader = new FileReader();
    if (files.length ) {
      let file = files[0];
      let mimeType = file.type;
      if (mimeType.startsWith('image/')) {
        let username = this.store.getItem('username');
        if (username === null) {
          username = 'Unknown';
        }

        reader.onload = (e: any) => {
          const base64Image = e.target.result;
          this.chat.addUserImg(username, base64Image, new Date());
          this.hyperion.sendChat(username, base64Image)
            .then(subject => {
              subject.subscribe((frame) => {
                let answer = this.chat.formatAnswerWithRequest(frame['ANS'], frame['REQ']);
                this.chat.addBotMsg(answer, frame['TIM']);
                this.audioSink.setBuffer(frame['PCM'], frame['TIM']);
                this.chat.addBotImg(frame['IMG'], frame['TIM']);
              });
            });
        };

        reader.readAsDataURL(file);
      } else if (mimeType === 'application/pdf') {
        this.hyperion.sendFileToContext(file).subscribe((res) => {
          this.chat.addBotMsg('<DOCOK>', new Date());
          console.log(res);
        }, (err) => {
          this.chat.addBotMsg('<DOCNOK>', new Date());
          console.error(err.error);
        });
      } else {
        this.chat.addBotMsg('<DOCNOK>', new Date());
        console.error(`"${mimeType}" file type not supported.`);
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
  }
}
