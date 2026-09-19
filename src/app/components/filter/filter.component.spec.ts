import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SingleSelectFilterConfig } from '~/app/models/filters';

import { FilterComponent } from './filter.component';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filter', new SingleSelectFilterConfig({ category: 'test', label: { value: 'Test', rawValue: 'test' }, placeholder: 'Test', field: 'test', options: [] }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
