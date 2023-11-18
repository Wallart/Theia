import {BehaviorSubject, Subject} from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@angular/core';
import { HyperionService } from './hyperion.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private botName: string = '';

  public messages: any[] = [];
  public messages$ = new Subject<any[]>();
  public model$: Subject<string> = new Subject<string>();
  public prompt$: Subject<string> = new Subject<string>();

  public messagesGroups: {[key:string]: [string, any]} = {};
  public messagesGroups$ = new Subject<any>();

  public activeViewUuid: string = '';

  constructor(private hyperion: HyperionService, private store: LocalStorageService) {
    this.hyperion.botName$.subscribe((botName: string) => this.botName = botName);
    this.hyperion.model$.subscribe((res) => {
      this.store.getView(this.activeViewUuid).then((view) => {
        if(view[0].model === '') {
          this.store.changeViewModel(this.activeViewUuid, res);
          this.hyperion.model = res;
          this.model$.next(res);
        }
      });
    });

    this.hyperion.prompt$.subscribe((res) => {
      this.store.getView(this.activeViewUuid).then((view) => {
        if(view[0].prompt === '') {
          this.store.changeViewPrompt(this.activeViewUuid, res);
          this.hyperion.prompt = res;
          this.prompt$.next(res);
        }
      });
    });
    this.fetchViews();
  }

  fetchViews() {
    this.store.listViews().then((views) => {
      let uuid: string;
      if (views.length === 0) {
        uuid = this.newChat();
      } else {
        for (const view of views) {
          this.messagesGroups[view.uuid] = [view.name, null];
        }

        uuid = this.store.getItem('activeChat');
        if (uuid === null || !(uuid in this.messagesGroups)) uuid = views[0].uuid;
      }

      this.activeChat = uuid;
      this.messagesGroups$.next(this.messagesGroups);
    });
  }

  rename(uuid: string, name: string) {
    this.messagesGroups[uuid][0] = name;
    this.store.renameView(uuid, name);
  }

  newChat() {
    const uuid = uuidv4();
    const name = 'New view';
    this.messagesGroups[uuid] = [name, []];
    this.store.addView(uuid, name, this.hyperion.model, this.hyperion.prompt);
    return uuid;
  }

  removeChat(uuid: string) {
    delete this.messagesGroups[uuid];
    this.store.deleteView(uuid);
  }

  set activeChat(uuid: string) {
    this.activeViewUuid = uuid;
    this.store.setItem('activeChat', this.activeViewUuid);

    let messages = this.messagesGroups[uuid][1];
    if (messages === null) {
      this.store.listMessages(uuid).then((messages) => {
        this.messages = messages;
        this.messages$.next(this.messages);
      });
    } else {
      this.messages = messages;
      this.messages$.next(this.messages);
    }

    this.store.getView(uuid).then((view) => {
      let model = view[0].model;
      if (model !== '') {
        this.hyperion.model = model;
        this.model$.next(model);
      }

      let prompt = view[0].prompt;
      if (prompt !== '') {
        this.hyperion.prompt = prompt;
        this.prompt$.next(prompt);
      }
    });
  }

  changeViewModel(model: string) {
    this.hyperion.model = model;
    this.store.changeViewModel(this.activeViewUuid, model);
  }

  changeViewPrompt(prompt: string) {
    this.hyperion.prompt = prompt;
    this.store.changeViewPrompt(this.activeViewUuid, prompt);
  }

  mockData() {
    this.messages = [
      { username: 'Julien', role: 'user', date: new Date(), content: ['Yo ! Comment ça va la famille ?'] },
      { username: 'Hypérion', role: 'bot', date: new Date(), content: ['Salut ça va bien merci'] },
      { username: 'Julien', role: 'user', date: new Date(), content: ['Cool, tant mieux !'] },
      { username: 'Hypérion', role: 'bot', date: new Date(), content: [
          "Très bien, merci pour ces informations.",
          "Pour créer une application permettant de dessiner des lignes rouges à l'aide du doigt sur un ordinateur, nous devrons utiliser une bibliothèque graphique qui permet de tracer des lignes en utilisant la souris ou un stylet.",
          "La bibliothèque JavaFX est une bibliothèque graphique pour Java qui est très utile pour créer des interfaces graphiques.",
          "Voici un exemple de code qui crée une toile de dessin et affiche les lignes rouges tracées par l'utilisateur:\n\n```java\nimport javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.canvas.Canvas;\nimport javafx.scene.canvas.GraphicsContext;\nimport javafx.scene.layout.BorderPane;\nimport javafx.scene.paint.Color;\nimport javafx.stage.Stage;\n\npublic class DessinLignes extends Application {\n\n    double x = 0, y = 0; //Position actuelle du curseur\n    GraphicsContext gc; //Contexte graphique pour tracer les lignes\n    Color couleur = Color.RED; //Couleur des lignes\n\n    public void start(Stage primaryStage) {\n\n        //Création d'une toile de dessin \n        Canvas canvas = new Canvas(800, 600);\n\n        //Obtention du contexte graphique pour tracer sur la toile\n        gc = canvas.getGraphicsContext2D();\n\n        //Définition de la couleur initiale des lignes\n        gc.setStroke(couleur); \n\n        //Association de la méthode dessinerLigne à l'événement de survol de la souris\n        canvas.setOnMouseDragged(e -> dessinerLigne(e.getSceneX(), e.getSceneY()));\n\n        //Création d'une scène contenant la toile de dessin\n        BorderPane root = new BorderPane(canvas);\n        Scene scene = new Scene(root, 800, 600);\n\n        //Affichage de la scène\n        primaryStage.setScene(scene);\n        primaryStage.show();\n    }\n\n    //Fonction qui dessine une ligne à partir de la position actuelle du curseur\n    //jusqu'à la nouvelle position donnée en entrée\n    private void dessinerLigne(double newX, double newY) {\n        gc.strokeLine(x, y, newX, newY);\n        x = newX;\n        y = newY;\n    }\n\n}\n```\n\nCe code crée une simple toile de dessin JavaFX qui affiche toutes les lignes rouges tracées par l'utilisateur.",
          "Le style de la ligne, comme sa largeur ou le type des extrémités peuvent être personnalisés.",
          "Dans cet exemple, on a utilisé la méthode `setOnMouseDragged()` pour permettre à l'utilisateur de dessiner des lignes en utilisant le survol de la souris.",
          "Toutefois, si vous souhaitez qu'on puisse utiliser la souris pour dessiner les lignes, il suffira de remplacer la ligne `canvas.setOnMouseDragged(e -> dessinerLigne(e.getSceneX(), e.getSceneY()));` en utilisant la méthode `setOnMousePressed()` et la méthode `setOnMouseDragged()`."
        ]
      }
    ];

    this.messages$.next(this.messages);
  }

  isLastSpeaker(username: string) {
    if (this.messages.length > 0) {
      // @ts-ignore
      return username == this.messages.at(-1).username;
    }
    return false;
  }

  getLastUserMsg() {
    for (let i=this.messages.length - 1; i > -1; i--) {
      if (this.messages.at(i).role === 'user') {
        return this.messages.at(i);
      }
    }
    return null;
  }

  formatAnswerWithRequest(answer: string, request: string) {
    // Check that the message to format is not a serviceToken
    if (this.hyperion.serviceTokens.indexOf(answer) === -1) {
      let lastMsg = this.getLastUserMsg();
      // Insert a new line, if last message does not match current request
      if (lastMsg !== null && lastMsg.content.at(-1) !== request) return '\n' + answer;
    }
    return answer;
  }

  clear() {
    this.messages.splice(0);
    this.messages$.next(this.messages);
    this.store.deleteMessages(this.activeViewUuid);
  }

  add(username: string, role: string, content: string, date: any) {
    if (content === '') return;

    let uuid: string;
    let message;
    if (this.isLastSpeaker(username)) {
      let last = this.messages.pop();
      let newContent = last.content;
      let splittedContent = content.split('\n');
      uuid = last.uuid;

      if (role === 'user') {
        newContent = last.content.concat([content]);
      } else {
        // Last line was a serviceToken. Or data is. Add to new line
        if (this.hyperion.serviceTokens.indexOf(newContent.at(-1)) > -1
          || this.hyperion.serviceTokens.indexOf(splittedContent[0]) > -1) {
          // Don't insert blank line after a serviceToken
          if (splittedContent[0].length > 0) newContent.push(splittedContent[0]);
        } else {
          // Concat data before a \n with last line
          let sep = newContent.at(-1).length === 0 ? '' : ' ';
          newContent[newContent.length - 1] = newContent.at(-1) + sep + splittedContent[0];
        }

        // Add remaining data on new line
        if (splittedContent.length > 1) {
          newContent = last.content.concat(splittedContent.slice(1));
        }
      }
      message = { uuid, username: last.username, role: last.role, date: date, content: newContent };
    } else {
      let newContent = content.split('\n');
      if (newContent.length > 1 && newContent[0] === '') newContent = newContent.slice(1);

      uuid = uuidv4();
      message = { uuid, username: username, role: role, date: date, content: newContent };
    }

    this.save(message);
    this.messages.push(message);
    this.messages$.next(this.messages);
  }


  addImg(username: string, role: string, content: Blob | string, date: any) {
    let uuid: string;
    let message;
    let newLines = [content, ''];
    if (this.isLastSpeaker(username)) {
      let last = this.messages.pop();
      uuid = last.uuid;
      let newContent = last.content.concat(newLines);

      message = { uuid, username: username, role: role, date: date, content: newContent };
    } else {
      uuid = uuidv4();
      message = { uuid, username: username, role: role, date: date, content: newLines };
    }

    this.save(message);
    this.messages.push(message);
    this.messages$.next(this.messages);
  }

  save(message: any) {
    const uuid = message.uuid;
    let messageCopy: any = Object.assign({}, message);
    messageCopy['viewUuid'] = this.activeViewUuid;

    this.store.putMessage(uuid, messageCopy);
  }

  addUserMsg(username: string, content: string, date: any) {
    this.add(username, 'user', content, date);
  }

  addBotMsg(content: string, date: any) {
    this.add(this.botName, 'bot', content, date);
  }

  addBotImg(imgBuffer: ArrayBuffer, date: any) {
    if (imgBuffer.byteLength === 0) {
      return;
    }

    const blob = new Blob([imgBuffer], {type: 'image/jpeg'});
    const objectURI = URL.createObjectURL(blob);
    this.addImg(this.botName, 'bot', objectURI, date);
  }

  // save() {
  //   this.store.setItem('chat', JSON.stringify(this.messagesGroups));
  //   this.store.insertMessage(JSON.stringify(this.messagesGroups));
  //   this.store.setItem('activeChat', this.activeUuid);
  // }
}
