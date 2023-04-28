import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonsAreaComponent } from './buttons-area.component';

describe('ButtonsAreaComponent', () => {
  let component: ButtonsAreaComponent;
  let fixture: ComponentFixture<ButtonsAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ButtonsAreaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonsAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
