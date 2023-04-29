import { Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'chat-history',
  templateUrl: './chat-history.component.html',
  styleUrls: ['./chat-history.component.css']
})
export class ChatHistoryComponent {
  constructor(public chat: ChatService, private electron: ElectronService) {}

  onCopy(event: any) {
    const node = event.target.parentElement.getElementsByClassName('content');
    if (node.length > 0) {
      const text = node[0].innerText;
      this.electron.writeToClipboard(text);
    }
  }
}
