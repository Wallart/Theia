import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Theia';

  // Useful for webpage version only
  ngOnInit() {
    window.addEventListener('dragover', (event: DragEvent) => {
      event.preventDefault();
      return false;
    }, false);

    window.addEventListener('drop', (event: DragEvent) => {
      event.preventDefault();
      return false;
    }, false);
  }
}
