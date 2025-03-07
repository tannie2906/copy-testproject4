import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LockboxComponent } from './lockbox.component';

describe('LockboxComponent', () => {
  let component: LockboxComponent;
  let fixture: ComponentFixture<LockboxComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LockboxComponent]
    });
    fixture = TestBed.createComponent(LockboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
