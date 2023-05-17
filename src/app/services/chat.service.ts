import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@angular/core';
import { HyperionService } from './hyperion.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: any[] = [];
  private messagesSubject = new BehaviorSubject<any[]>(this.messages);

  public activeUuid: string = '';
  public messagesGroups: {[key:string]: [string, any[]]} = {};
  public messages$: Observable<any[]> = this.messagesSubject.asObservable();

  constructor(private hyperion: HyperionService, private store: LocalStorageService) {
    let uuid: string;
    const chatHistory = this.store.getItem('chat');
    if (chatHistory === null) {
      uuid = this.newChat();
    } else {
      this.messagesGroups = JSON.parse(chatHistory);
      uuid = this.store.getItem('activeChat');
      if (uuid === null) {
        uuid = Object.keys(this.messagesGroups)[0];
      }
    }
    this.activeChat = uuid;
  }

  rename(uuid: string, name: string) {
    this.messagesGroups[uuid][0] = name;
    this.save();
  }

  newChat(): string {
    const uuid = uuidv4();
    this.messagesGroups[uuid] = ['New view', []];
    this.save()
    return uuid;
  }

  removeChat(uuid: string) {
    delete this.messagesGroups[uuid];
    this.save()
  }

  set activeChat(uuid: string) {
    this.activeUuid = uuid;
    this.messages = this.messagesGroups[uuid][1];
    this.messagesSubject.next(this.messages);
    this.store.setItem('activeChat', this.activeUuid);
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
    this.save()
  }

  add(username: string, role: string, content: string, date: any) {
    if (this.isLastSpeaker(username)) {
      let last = this.messages.pop();
      let newContent = last.content;
      let splittedContent = content.split('\n');

      newContent[newContent.length - 1] = newContent.at(-1) + ' ' + splittedContent[0];
      if (splittedContent.length > 1) {
        newContent = last.content.concat(splittedContent.slice(1));
      }
      this.messages.push({ username: last.username, role: last.role, date: date, content: newContent});
    } else {
      this.messages.push({ username: username, role: role, date: date, content: content.split('\n') })
    }
    this.messagesSubject.next(this.messages);
    this.save()
  }

  addUserMsg(username: string, content: string, date: any) {
    this.add(username, 'user', content, date);
  }

  addBotMsg(content: string, date: any) {
    this.hyperion.getName().subscribe((botName: string) => {
      this.add(botName, 'bot', content, date);
    });
  }

  save() {
    this.store.setItem('chat', JSON.stringify(this.messagesGroups));
    this.store.setItem('activeChat', this.activeUuid);
  }
}
