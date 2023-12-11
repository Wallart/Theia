import { liveQuery } from 'dexie';
import { db } from '../../database';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() {
    if (this.getItem('appIdentifier') === null) {
      const identifier = uuidv4();
      this.setItem('appIdentifier', identifier);
      console.log(`App identifier: ${identifier}`);
    }
  }

  addView(uuid: string, name: string, model: string, prompt: string, indexes: string[]) {
    return db.views.add({ uuid, name, model, prompt, indexes });
  }

  deleteView(uuid: string) {
    return db.views.where('uuid').equals(uuid).delete();
  }

  renameView(uuid: string, name: string) {
    return db.views.where('uuid').equals(uuid).modify({ name });
  }

  changeViewModel(uuid: string, model: string) {
    return db.views.where('uuid').equals(uuid).modify({ model });
  }

  changeViewPrompt(uuid: string, prompt: string) {
    return db.views.where('uuid').equals(uuid).modify({ prompt });
  }

  changeViewIndexes(uuid: string, indexes: string[]) {
    return db.views.where('uuid').equals(uuid).modify({ indexes });
  }

  listViews() {
    return db.views.toArray();
  }

  getView(viewUuid: string) {
    return db.views.where('uuid').equals(viewUuid).toArray();
  }

  putMessage(uuid: string, message: any) {
    this.fetchAttachments(message)
      .then((fetchedMessage) => {
        db.messages.where('uuid').equals(uuid)
          .modify(fetchedMessage)
          .then((updated) => {
            if (updated === 0) {
              db.messages.add(fetchedMessage);
            }
          });
      });
  }

  async fetchAttachments(message: any) {
    for (let i=0; i < message.content.length; i++) {
      if (message.content[i].startsWith('blob:') ) {
        let blob = await fetch(message.content[i]).then(r => r.blob());
        message.content[i] = blob;
      }
    }
    return message;
  }

  listMessages(viewUuid: string) {
    return db.messages.where('viewUuid').equals(viewUuid).toArray();
  }

  deleteMessages(viewUuid: string) {
    return db.messages.where('viewUuid').equals(viewUuid).delete();
  }

  public setItem(key: string, value: any) {
    localStorage.setItem(key, value);
  }

  public getItem(key: string): any {
    return localStorage.getItem(key)
  }

  public removeItem(key:string) {
    localStorage.removeItem(key);
  }

  public clear(){
    localStorage.clear();
  }
}
