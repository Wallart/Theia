import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'escape'
})
export class EscapePipe implements PipeTransform {

  transform(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;") // Remplace & par &amp;
      .replace(/</g, "&lt;")  // Remplace < par &lt;
      .replace(/>/g, "&gt;")  // Remplace > par &gt;
      .replace(/"/g, "&quot;") // Remplace " par &quot;
      .replace(/'/g, "&#039;"); // Remplace ' par &#039;
  }

}
