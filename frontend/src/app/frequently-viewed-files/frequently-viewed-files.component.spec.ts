import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrequentlyViewedFilesComponent } from './frequently-viewed-files.component';

describe('FrequentlyViewedFilesComponent', () => {
  let component: FrequentlyViewedFilesComponent;
  let fixture: ComponentFixture<FrequentlyViewedFilesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FrequentlyViewedFilesComponent]
    });
    fixture = TestBed.createComponent(FrequentlyViewedFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
