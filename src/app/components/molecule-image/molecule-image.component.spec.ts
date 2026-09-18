import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { MoleculeImageComponent } from './molecule-image.component';

describe('MoleculeImageComponent', () => {
  let component: MoleculeImageComponent;
  let fixture: ComponentFixture<MoleculeImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [MoleculeImageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
})
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
