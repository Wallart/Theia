import { Component } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import {ElectronService} from "../../services/electron.service";

@Component({
  selector: 'tabs-bar',
  templateUrl: './tabs-bar.component.html',
  styleUrls: ['./tabs-bar.component.css']
})
export class TabsBarComponent {

  tabs: any[] = [];
  newTabShortcut: string = '';

  constructor(private chat: ChatService, private electron: ElectronService) {
    this.chat.messagesGroups$.subscribe((data: any) => {
      for (let uuid in data) {
        const active = uuid === this.chat.activeViewUuid;
        this.tabs.push({ uuid, name: data[uuid][0], active });
      }
    });

    this.electron.bind('keymap', (event: Object, keymap: Object) => {
      for(let key in keymap) {
        const attribute = `${key}Shortcut`;
        // @ts-ignore
        if (attribute in this) this[attribute] = keymap[key];
      }
    });
    this.electron.bind('newTab', (event: Object) => {
      console.log(`Keyboard shortcut : newTab`);
      this.onNewTab();
    });
  }

  activeTab(uuid: string) {
    for (const tab of this.tabs) {
      tab.active = tab.uuid === uuid;
    }
  }

  onNewTab() {
    const uuid = this.chat.newChat();
    this.chat.activeChat = uuid;
    const chat = this.chat.messagesGroups[uuid];
    this.tabs.push({ uuid: uuid, name: chat[0], active: true});
    this.activeTab(uuid);
  }

  onTabClose(uuid: string) {
    if (this.tabs.length < 2) return;

    let changeRequired = false;
    for (let i=0; i < this.tabs.length; i++) {
      const tab = this.tabs[i];
      if (tab.uuid === uuid) {
        if (tab.active) changeRequired = true;
        this.tabs.splice(i, 1);
        this.chat.removeChat(tab.uuid);
        break;
      }
    }

    if (changeRequired) {
      this.tabs[0].active = true;
      this.chat.activeChat = this.tabs[0].uuid;
    }
  }

  onClick(uuid: string) {
    this.activeTab(uuid);
    this.chat.activeChat = uuid;
  }

  onDblClick(event: any) {
    event.target.removeAttribute('readonly');
  }

  onFocusOut(event: any, uuid:string) {
    event.target.setAttribute('readonly', '');
    if (event.target.value !== '') {
      const name = event.target.value;
      this.chat.rename(uuid, name);
      event.target.placeholder = name;
      event.target.value = '';
    }
  }
}
