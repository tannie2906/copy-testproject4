import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Setup2faComponent } from './setup2fa.component';

describe('Setup2faComponent', () => {
  let component: Setup2faComponent;
  let fixture: ComponentFixture<Setup2faComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [Setup2faComponent]
    });
    fixture = TestBed.createComponent(Setup2faComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
