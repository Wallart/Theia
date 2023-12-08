import { forkJoin } from 'rxjs';
import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { IndexService } from '../services/index.service';
import { HyperionService } from '../services/hyperion.service';
import { TreeModel, TreeNode } from '@circlon/angular-tree-component';

@Component({
  selector: 'app-indexes-manager',
  templateUrl: './indexes-manager.component.html',
  styleUrls: ['./indexes-manager.component.css']
})
export class IndexesManagerComponent {
  indexesInput: string = '';
  nodes: any = [];
  label = '';
  loaderVisible = false;

  options = {
    allowDrag: false,
    allowDrop: (element: any, { parent, index }: any) => {
      return (parent.data.name !== undefined && this.indexes.indexOf(parent.data.name) > -1)
    },
    actionMapping: {
      mouse: {
        drop: (tree: TreeModel, node: TreeNode, $event: any, {from, to}: any) => {
          let indexName = to.parent.data.name;
          if (indexName !== undefined) {
            const files = $event.dataTransfer.files;
            this.hyperion.sendFilesToIndex(files, indexName).subscribe((res) => {
              this.indexes = [];
              this.hyperion.listIndexes();
            });
          }
        }
      }
    }
  };
  indexes: string[] = [];

  constructor(private hyperion: HyperionService, private index: IndexService, private title: Title) {
    this.index.indexes$.subscribe((res) => {
      if (JSON.stringify(this.indexes) !== JSON.stringify(res)) {
        this.indexes = res;
        this.updateNodes();
      } else {
        this.loaderVisible = false;
      }
    });
  }

  ngOnInit() {
    this.title.setTitle('Indexes manager');
    this.pollMemoryState();
    this.hyperion.listIndexes();
  }

  pollMemoryState() {
    setTimeout(() => {
      this.hyperion.getMemoryState().subscribe((res) => {
        this.label = res;
        console.log(res);

        this.loaderVisible = res === 'indexing';
        this.pollMemoryState();
      }, () => this.pollMemoryState());
    }, 1000);
  }

  updateNodes() {
    if (this.indexes.length > 0) {
      let indexes: any = [];
      let requests = [];
      for (let e of this.indexes) {
        requests.push(this.hyperion.listDocuments(e));
        indexes.push(e);
      }

      forkJoin(requests).subscribe((values: any) => {
        let nodes: any = [];
        for (let i=0; i < values.length; i++) {
          nodes.push({ name: indexes[i], children: values[i].map((e: any) => ({ name: e, index: indexes[i]}) )});
        }
        this.nodes = nodes;
        this.loaderVisible = false;
      });
    } else {
      this.nodes = [];
      this.loaderVisible = false;
    }
  }

  findIndex(indexName: string) {
    let cursor = -1;
    for (let i=0; i < this.nodes.length; i++) {
      if (this.nodes[i].name === indexName) {
        cursor = i;
        break;
      }
    }
    return cursor;
  }

  findDocument(indexPos: number, documentName: string) {
    let cursor = -1;
    let docs = this.nodes[indexPos].children;
    if (docs !== undefined) {
      for (let i=0; i < docs.length; i++) {
        if (docs[i].name === documentName) {
          cursor = i;
          break;
        }
      }
    }

    return cursor;
  }

  deleteFromIndexes(indexName: string) {
    let idx = this.indexes.indexOf(indexName);
    if (idx > -1) {
      this.indexes.splice(idx, 1);
    }
  }

  deleteIndexFromNodes(indexName: string) {
    let cursor = this.findIndex(indexName);
    if (cursor > -1) {
      let nodesCopy = [...this.nodes];
      nodesCopy.splice(cursor, 1);
      this.nodes = nodesCopy;
    }
  }

  deleteDocFromNodes(indexPos: number, docName: string) {
    let cursor = this.findDocument(indexPos, docName);
    if (cursor > -1) {
      this.nodes[indexPos].children.splice(cursor, 1);
      this.nodes = [...this.nodes];
    }
  }

  onNodeDelete(nodeName: string, hasParent: string) {
    this.loaderVisible = true;
    if (hasParent === undefined) {
      this.hyperion.deleteIndex(nodeName).subscribe((res) => {
        this.deleteIndexFromNodes(nodeName);
        this.deleteFromIndexes(nodeName);
        this.loaderVisible = false;
      });
    } else {
      // this.deleteDocFromNodes(this.findIndex(hasParent), nodeName);
      this.hyperion.deleteInIndex(hasParent, nodeName).subscribe((res) => {
        this.deleteDocFromNodes(this.findIndex(hasParent), nodeName);
        this.loaderVisible = false;
      });
    }
  }

  onRefresh() {
    this.indexes = [];
    this.hyperion.listIndexes();
    this.loaderVisible = true;
  }

  onIndexCreated() {
    this.hyperion.createIndex(this.indexesInput)
      .subscribe((res) => {
        this.hyperion.listIndexes();
      });
    this.indexesInput = '';
    this.loaderVisible = true;
  }

  onFileUpload(event: any, indexName: string) {
    const files = event.target.files;
    this.loaderVisible = true;
    this.hyperion.sendFilesToIndex(files, indexName).subscribe((res) => {
      this.indexes = [];
      this.hyperion.listIndexes();
    });
  }
}
