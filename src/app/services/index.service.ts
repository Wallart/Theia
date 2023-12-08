import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndexService {

  indexes: string[] = []
  public indexes$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(this.indexes);

  constructor() {}

  updateIndices(indexes: string[]) {
    this.indexes = indexes;
    this.indexes$.next(this.indexes);
  }
}
