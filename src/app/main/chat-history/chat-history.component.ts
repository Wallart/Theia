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
      this.messages = data;
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
}
