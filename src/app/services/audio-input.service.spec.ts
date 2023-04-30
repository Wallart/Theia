import { TestBed } from '@angular/core/testing';

import { AudioInputService } from './audio-input.service';

describe('AudioInputService', () => {
  let service: AudioInputService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioInputService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
