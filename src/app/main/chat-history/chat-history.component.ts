import { Component, ChangeDetectorRef } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.css']
})
export class ChatHistoryComponent {
  messages: any[] = [];

  constructor(public chat: ChatService, private electron: ElectronService, private changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.chat.messages$.subscribe(data => {
      let newData = [];
      for (let message of data) {
        const clone = JSON.parse(JSON.stringify(message));
        clone.content = this.decomposeContent(clone.content);
        newData.push(clone);
      }
      this.messages = newData;
      this.changeDetectorRef.detectChanges();
    });
  }

  onCopy(event: any) {
    const node = event.target.parentElement.getElementsByClassName('content');
    if (node.length > 0) {
      const text = node[0].innerText;
      this.electron.writeToClipboard(text);
    }
  }

  decomposeContent(message: string[]) {
    const chunks: any[] = [];
    let isCode = false;
    for (let i=0; i < message.length; i++) {
      let sentence = message[i];
      const splittedSentence = sentence.split('```');
      if (splittedSentence.length > 1) {
        isCode = !isCode;
        for (let j=0; j < splittedSentence.length; j++) {
          const chunk = splittedSentence[j];
          if (chunk === '') {
            continue;
          }
          isCode = (j % 2 != 0);
          // chunks.push({ isCode: isCode, content: chunk});
          if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
            chunks.push({ isCode: isCode, content: chunk.trim()});
          } else {
            chunks[chunks.length - 1].content += '\n' + chunk.trim();
          }
        }
      } else {
        // chunks.push({ isCode: isCode, content: splittedSentence[0]});
        if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
          chunks.push({ isCode: isCode, content: splittedSentence[0].trim()});
        } else {
          chunks[chunks.length - 1].content += '\n' + splittedSentence[0];
        }
      }
    }

    return chunks;
  }
}
