import { Component, ViewChild } from '@angular/core';

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

  ngAfterViewChecked() {
    const element = this.container.nativeElement.getElementsByTagName('chat-history')[0];
    if (this.lastHeight !== element.scrollHeight) {
      console.log('Change detected');
      this.lastHeight = element.scrollHeight;
      if (this.initialScrollDone) {
        const scrollHeight = element.scrollHeight;
        const percentPos = (element.getBoundingClientRect().height + element.scrollTop) / scrollHeight;
        if (percentPos >= this.stickyPos) {
          element.scrollTop = scrollHeight;
        }
      } else {
        this.initialScrollDone = true;
        element.scrollTop = element.scrollHeight;
      }
    }
  }
}
