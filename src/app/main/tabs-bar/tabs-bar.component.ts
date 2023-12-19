import { ChangeDetectorRef, Component, ElementRef, HostListener } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'tabs-bar',
  templateUrl: './tabs-bar.component.html',
  styleUrls: ['./tabs-bar.component.css']
})
export class TabsBarComponent {

  tabs: any[] = [];
  newTabShortcut: string = '';
  closeTabShortcut: string = '';
  dragging = false;
  dragIndex = -1;

  constructor(private chat: ChatService, private electron: ElectronService,
              private changeDetectorRef: ChangeDetectorRef, private el: ElementRef) {
    this.chat.messagesGroups$.subscribe((data: any) => {
      for (let uuid in data) {
        const active = uuid === this.chat.activeViewUuid;
        this.tabs.push({ uuid, name: data[uuid][0], active });
      }
      setTimeout(() => this.defineBorderStyle(), 100);
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
      this.changeDetectorRef.detectChanges();
    });

    this.electron.bind('prevTab', (event: Object) => {
      console.log(`Keyboard shortcut : prevTab`);

      let activeTabIdx = this.findActiveTabIdx();
      activeTabIdx = Math.max(0, activeTabIdx - 1);

      this.tabs[activeTabIdx + 1].active = false;
      this.tabs[activeTabIdx].active = true;
      this.changeDetectorRef.detectChanges();

      this.chat.activeChat = this.tabs[activeTabIdx].uuid;
    });

    this.electron.bind('nextTab', (event: Object) => {
      console.log(`Keyboard shortcut : nextTab`);

      let activeTabIdx = this.findActiveTabIdx();
      activeTabIdx = Math.min(activeTabIdx + 1, this.tabs.length - 1);

      this.tabs[activeTabIdx - 1].active = false;
      this.tabs[activeTabIdx].active = true;
      this.changeDetectorRef.detectChanges();

      this.chat.activeChat = this.tabs[activeTabIdx].uuid;
    });

    this.electron.bind('closeTab', (event: Object) => {
      console.log(`Keyboard shortcut : closeTab`);
      this.onTabClose(this.chat.activeViewUuid);
      this.changeDetectorRef.detectChanges();
    });
  }

  findActiveTabIdx() {
    let activeTabIdx = -1;
    for (let i=0; i < this.tabs.length; i++) {
      if (this.tabs[i].active) {
        activeTabIdx = i;
        break;
      }
    }
    return activeTabIdx;
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

    // Auto-scroll tabs
    const tabsContainer = this.el.nativeElement.querySelector('#tabs-container');
    setTimeout(() => tabsContainer.scrollLeft = tabsContainer.scrollWidth, 100);
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
      const idx = this.tabs.length - 1;
      this.tabs[idx].active = true;
      this.chat.activeChat = this.tabs[idx].uuid;
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

  onScroll() {
    this.defineBorderStyle();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.defineBorderStyle();
  }

  defineBorderStyle() {
    const container = this.el.nativeElement.querySelector('#tabs-container');
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const scrollLeftMax = scrollWidth - clientWidth;

    if (scrollLeft > 0) {
      container.classList.add('left-border-visible');
    } else {
      container.classList.remove('left-border-visible');
    }

    if (scrollLeft < scrollLeftMax) {
      container.classList.add('right-border-visible');
    } else {
      container.classList.remove('right-border-visible');
    }
  }

  dragStart(index: number) {
    this.dragging = true;
    this.dragIndex = index;
  }

  dragOver(index: number) {
    const draggedTab = this.tabs[this.dragIndex];
    this.tabs.splice(this.dragIndex, 1);
    this.tabs.splice(index, 0, draggedTab);
    this.dragIndex = index;
  }

  dragEnd() {
    this.dragging = false;
    this.dragIndex = -1;
  }
}
