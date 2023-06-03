import Dexie, { Table } from 'dexie';

export interface Views {
  id?: number;
  uuid: string;
  name: string;
}

export interface Messages {
  id?: number;
  uuid: string;
  viewUuid: string;
  data: any;
}

export class AppDB extends Dexie {
  versionNum = 1;
  views!: Table<Views, number>;
  messages!: Table<Messages, number>;

  constructor() {
    super('ngdexieliveQuery');
    navigator.storage.persisted()
      .then((res) => {
        if (!res) navigator.storage.persist().then((res) => console.log(`DB persistance : ${res}`));
      });
    this.version(this.versionNum).stores({
      views: '++id, &uuid',
      messages: '++id, &uuid, viewUuid',
    });
    this.on('populate', () => this.populate());
  }

  async populate() {
    // const todoListId = await db.todoLists.add({
    //   title: 'To Do Today',
    // });
    // await db.todoItems.bulkAdd([
    //   {
    //     todoListId,
    //     title: 'Feed the birds',
    //   },
    //   {
    //     todoListId,
    //     title: 'Watch a movie',
    //   },
    //   {
    //     todoListId,
    //     title: 'Have some sleep',
    //   },
    // ]);
  }
}

export const db = new AppDB();
