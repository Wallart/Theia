import { Injectable } from '@angular/core';
import { HyperionService } from './hyperion.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: any[] = [];
  private messagesSubject = new BehaviorSubject<any[]>(this.messages);

  public messages$: Observable<any[]> = this.messagesSubject.asObservable();

  constructor(private hyperion: HyperionService) {
    this.mockData();
  }

  mockData() {
    this.messages = [
      { username: 'Julien', role: 'user', date: new Date(), content: ['Yo ! Comment ça va la famille ?'] },
      { username: 'Hypérion', role: 'bot', date: new Date(), content: ['Salut ça va bien merci'] },
      { username: 'Julien', role: 'user', date: new Date(), content: ['Cool, tant mieux !'] },
      { username: 'Hypérion', role: 'bot', date: new Date(), content: [
          'Bien sûr, voici un exemple des sections `extraResources` et `extraFiles` dans la configuration d\'electron-builder :',
          '```json',
          '"build": {',
          '    "extraResources": [',
          '      "chemin/vers/dossier1",',
          '      "chemin/vers/dossier2",',
          '      "chemin/vers/fichier1.json"',
          '    ],',
          '    "extraFiles": [',
          '      "chemin/vers/fichier1.bin",',
          '      "chemin/vers/dossier4/fichier2"',
          '    ],',
          '}',
          '```'
        ]
      }
    ];

    this.messagesSubject.next(this.messages);
  }

  isLastSpeaker(username: string) {
    if (this.messages.length > 0) {
      // @ts-ignore
      return username == this.messages.at(-1).username;
    }
    return false;
  }

  clear() {
    this.messages.splice(0);
    this.messagesSubject.next(this.messages);
  }

  add(username: string, role: string, content: string[], date: any) {
    if (this.isLastSpeaker(username)) {
      let last = this.messages.pop();
      // @ts-ignore
      this.messages.push({ username: last.username, role: last.role, date: date, content: last.content.concat(content)});
    } else {
      this.messages.push({ username: username, role: role, date: date, content: content })
    }
    this.messagesSubject.next(this.messages);
  }

  addUserMsg(username: string, content: string[], date: any) {
    this.add(username, 'user', content, date);
  }

  addBotMsg(content: string[], date: any) {
    this.hyperion.getName().subscribe((botName: string) => {
      this.add(botName, 'bot', content, date);
    });
  }
}
