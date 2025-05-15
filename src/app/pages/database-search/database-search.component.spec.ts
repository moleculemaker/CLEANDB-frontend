import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatabaseSearchComponent } from './database-search.component';

describe('DatabaseSearchComponent', () => {
  let component: DatabaseSearchComponent;
  let fixture: ComponentFixture<DatabaseSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatabaseSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
