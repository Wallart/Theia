import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { HyperionService } from '../services/hyperion.service';

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

  constructor(private chat: ChatService, private hyperion: HyperionService) {
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
}
