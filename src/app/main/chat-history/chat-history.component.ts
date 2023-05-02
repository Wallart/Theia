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
    const contentNode = event.target.parentElement.getElementsByClassName('content');
    const codeNode = event.target.parentElement.getElementsByTagName('code');
    if (contentNode.length > 0) {
      const text = contentNode[0].innerText;
      this.electron.writeToClipboard(text);
    } else if (codeNode.length > 0) {
      const code = codeNode[0].innerText;
      this.electron.writeToClipboard(code);
    }
  }

  decomposeContent(message: string[]) {
    const chunks: any[] = [];
    let isCode = false;
    for (let i=0; i < message.length; i++) {
      let sentence = message[i];
      const splittedSentence = sentence.split('```');
      if (splittedSentence.length > 1) {
        // if (!isCode && splittedSentence[1].length > 0 && !splittedSentence[1].startsWith(' ')) {
        //   console.log(`Detected language: ${splittedSentence[1]}`);
        //   debugger;
        //   splittedSentence[1] = '';
        // }

        // isCode = !isCode;
        for (let j=0; j < splittedSentence.length; j++) {
          isCode = (j % 2 != 0) ? !isCode : false;
          const chunk = splittedSentence[j];
          if (chunk === '') {
            continue;
          }
          // chunks.push({ isCode: isCode, content: chunk});
          if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
            chunks.push({ isCode: isCode, content: chunk});
          } else {
            chunks[chunks.length - 1].content += '\n' + chunk;
          }
        }
      } else {
        // chunks.push({ isCode: isCode, content: splittedSentence[0]});
        if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
          chunks.push({ isCode: isCode, content: splittedSentence[0]});
        } else {
          chunks[chunks.length - 1].content += '\n' + splittedSentence[0];
        }
      }
    }

    return chunks;
  }
}
