import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndexesManagerComponent } from './indexes-manager.component';

describe('IndexesManagerComponent', () => {
  let component: IndexesManagerComponent;
  let fixture: ComponentFixture<IndexesManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IndexesManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndexesManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
