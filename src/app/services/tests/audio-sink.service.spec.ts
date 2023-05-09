import { TestBed } from '@angular/core/testing';

import { AudioSinkService } from '../audio-sink.service';

describe('AudioSinkService', () => {
  let service: AudioSinkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioSinkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
