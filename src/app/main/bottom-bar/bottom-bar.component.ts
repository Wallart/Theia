import { Component, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';
import { HyperionService } from '../../services/hyperion.service';

@Component({
  selector: 'bottom-bar',
  templateUrl: './bottom-bar.component.html',
  styleUrls: ['./bottom-bar.component.css']
})
export class BottomBarComponent {
  @ViewChild('message') message: any;
  @ViewChild('username') username: any;

  constructor(private electron: ElectronService, private chat: ChatService, private hyperion: HyperionService) {}

  onClear() {
    this.chat.clear();
  }

  onGear() {
    this.electron.send('open-settings');
  }

  onSend(event: any) {
    let message = event.target.value;
    let username = this.username.nativeElement.value;
    if (username === '') {
      username = 'Unknown';
    }

    this.message.nativeElement.value = '';
    this.chat.addUserMsg(username, [message], new Date());
    this.hyperion.send(username, message).subscribe((response) => {
      const decodedData = {};
      this.hyperion.frameDecode(response, decodedData, (validFrame: any) => {
        const message = [validFrame['ANS']];
        this.chat.addBotMsg(message, new Date(validFrame['TIM'] * 1000));
      });
    });
  }
}
