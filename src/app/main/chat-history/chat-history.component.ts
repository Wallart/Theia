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
    const latexEqNode = event.target.parentElement.getElementsByClassName('latex');
    if (contentNode.length > 0) {
      const text = contentNode[0].innerText;
      this.electron.writeToClipboard(text);
    } else if (codeNode.length > 0) {
      const code = codeNode[0].innerText;
      this.electron.writeToClipboard(code);
    } else if (latexEqNode.length > 0) {
      const latexEquation = latexEqNode[0].getAttribute('data-latex-equation');
      this.electron.writeToClipboard(latexEquation);
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
    let isLatex = false;
    for (let i=0; i < message.length; i++) {
      let data: any = message[i];
      // if (typeof data !== 'string') {
      if (typeof data !== 'string' || data.startsWith('blob:')) {
        const objectURI = (typeof data !== 'string') ? URL.createObjectURL(data) : data;
        chunks.push({ isCode: false, isLatex:false, isImg: true, content: objectURI});
        continue;
      }

      if (this.hyperion.serviceTokens.indexOf(data.trim()) > -1) {
        let systemMessage;
        switch (data.trim()) {
          case this.hyperion.serviceTokens[1]:
            systemMessage = 'Memory wiped';
            break;
          case this.hyperion.serviceTokens[2]:
            systemMessage = 'Put to sleep';
            break;
          case this.hyperion.serviceTokens[3]:
            systemMessage = 'Woken up';
            break;
          case this.hyperion.serviceTokens[4]:
            systemMessage = 'Confused';
            break;
          case this.hyperion.serviceTokens[5]:
            systemMessage = 'Flatlined';
            break;
          case this.hyperion.serviceTokens[6]:
            systemMessage = 'Command executed';
            // TODO Improved with details
            break;
          case this.hyperion.serviceTokens[7]:
            systemMessage = 'Document registered';
            break;
          case this.hyperion.serviceTokens[8]:
            systemMessage = 'Invalid document';
            break;
        }
        chunks.push({ isCode: false, isLatex:false, isImg: false, isSystem: true, content: systemMessage});
        continue;
      }

      const splittedSentenceInCode = data.split('```');
      const splittedSentenceInLatex = data.split(/\$\$|\\\[|\\\]/); // for multine latex "$$ $$" or "\[ \]"
      if (splittedSentenceInCode.length > 1) {
        for (let j=0; j < splittedSentenceInCode.length; j++) {
          let chunk = splittedSentenceInCode[j];

          if (splittedSentenceInCode.length % 2 === 0) {
            // Multiline code
            if ((j % 2 === 0 && !isCode) || (j % 2 !== 0 && isCode)) {
              isCode = false;
              if (chunk === '') continue;
            } else {
              isCode = true;
            }
          } else {
            // One line code
            if (j % 2 === 0) {
              isCode = false;
              if (chunk === '') continue;
            } else {
              isCode = true;
            }
          }

          if (chunks.length === 0 || !isCode || !chunks[chunks.length - 1].isCode) {
            chunks.push({ isCode: isCode, isLatex:false, isImg: false, isSystem: false, content: chunk});
          } else {
            chunks[chunks.length - 1].content += '\n' + chunk;
          }
        }
      } else if (splittedSentenceInLatex.length > 1) {
        for (let j=0; j < splittedSentenceInLatex.length; j++) {
          let chunk = splittedSentenceInLatex[j];

          if (splittedSentenceInLatex.length % 2 === 0) {
            // Multiline LateX equation
            if ((j % 2 === 0 && !isLatex) || (j % 2 !== 0 && isLatex))  {
              isLatex = false;
              if (chunk === '') continue;
            } else if ((j % 2 !== 0) || (j % 2 == 0 && isLatex)) {
              isLatex = true;
              chunk = '$$ ' + chunk;
            }
          } else {
            // One line LateX equation
            if (j % 2 === 0) {
              isLatex = false;
              if (chunk === '') continue;
            } else {
              isLatex = true;
              chunk = `$$ ${chunk} $$`;
            }

          }

          if (chunks.length === 0 || !isLatex || !chunks[chunks.length - 1].isLatex) {
            chunks.push({ isLatex: isLatex, isCode: false, isImg: false, isSystem: false, content: chunk});
          } else {
            chunks[chunks.length - 1].content += '\n' + chunk;
          }
        }
      } else {
        if (chunks.length === 0 || (!isCode && !isLatex) || (!chunks[chunks.length - 1].isCode && !chunks[chunks.length - 1].isLatex)) {
          chunks.push({ isLatex: isLatex, isCode: isLatex, isImg: false, isSystem: false, content: data});
        } else {
          // Adding new code / latex lines
          chunks[chunks.length - 1].content += '\n' + data;
        }
      }
    }

    return chunks;
  }
}
