import { TestBed } from '@angular/core/testing';

import { VideoInputService } from './video-input.service';

describe('VideoInputService', () => {
  let service: VideoInputService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VideoInputService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
