import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoFeedbackComponent } from './video-feedback.component';

describe('VideoFeedbackComponent', () => {
  let component: VideoFeedbackComponent;
  let fixture: ComponentFixture<VideoFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoFeedbackComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
