import { Injectable } from '@angular/core';
import { liveQuery } from 'dexie';
import { db } from '../../database';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() {}

  addView(uuid: string, name: string) {
    return db.views.add({ uuid, name });
  }

  deleteView(uuid: string) {
    return db.views.where('uuid').equals(uuid).delete();
  }

  renameView(uuid: string, name: string) {
    return db.views.where('uuid').equals(uuid).modify({ name });
  }

  listViews() {
    return db.views.toArray();
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
