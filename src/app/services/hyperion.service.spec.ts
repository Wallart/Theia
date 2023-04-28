import { TestBed } from '@angular/core/testing';

import { HyperionService } from './hyperion.service';

describe('HyperionService', () => {
  let service: HyperionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HyperionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
