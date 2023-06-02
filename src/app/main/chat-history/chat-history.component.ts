import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import { ChatService } from '../../services/chat.service';
import { StatusService } from '../../services/status.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';
import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';

@Component({
  selector: 'chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.css']
})
export class ChatHistoryComponent {
  @ViewChild('typing') typing: any;

  bot = '';
  messages: any[] = [];

  constructor(public chat: ChatService, private electron: ElectronService, private status: StatusService,
              private hyperion: HyperionService, private changeDetectorRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.chat.messages$.subscribe(data => {
      let newData = [];
      for (let message of data) {
        const clone = Object.assign({}, message);
        clone.content = this.decomposeContent(clone.content);
        newData.push(clone);
      }
      this.messages = newData;
      this.changeDetectorRef.detectChanges();
    });
    this.hyperion.botName$.subscribe((name) => this.bot = name);
  }

  ngAfterViewInit() {
    this.status.typing$.subscribe((typing) => {
      if (typing) {
        this.typing.nativeElement.setAttribute('class', '');
      } else {
        this.typing.nativeElement.setAttribute('class', 'hidden-indicator');
      }
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

  onSave(blobUrl: string) {
    fetch(blobUrl)
      .then((r) => r.blob())
      .then((blob: Blob) => saveAs(blob, `${uuidv4()}.jpg`));
  }

  decomposeContent(message: string[]) {
    const chunks: any[] = [];
    let isCode = false;
    for (let i=0; i < message.length; i++) {
      let data: any = message[i];
      // if (typeof data !== 'string') {
      if (typeof data !== 'string' || data.startsWith('blob:')) {
        const objectURI = (typeof data !== 'string') ? URL.createObjectURL(data) : data;
        chunks.push({ isCode: false, isImg: true, content: objectURI});
        continue;
      }


      const splittedSentence = data.split('```');
      if (splittedSentence.length > 1) {
        for (let j=0; j < splittedSentence.length; j++) {
          const chunk = splittedSentence[j];
          if (j % 2 === 0) {
            isCode = false;
          } else if (chunk === '') {
            isCode = false;
          } else {
            isCode = !isCode;
          }
          if (chunk === '') {
            continue;
          }

          if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
            chunks.push({ isCode: isCode, isImg: false, content: chunk});
          } else {
            chunks[chunks.length - 1].content += '\n' + chunk;
          }
        }
      } else {
        if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
          chunks.push({ isCode: isCode, isImg: false, content: splittedSentence[0]});
        } else {
          chunks[chunks.length - 1].content += '\n' + splittedSentence[0];
        }
      }
    }

    return chunks;
  }
}
