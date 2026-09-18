import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Molecule3dComponent } from './molecule3d.component';

describe('Molecule3dComponent', () => {
  let component: Molecule3dComponent;
  let fixture: ComponentFixture<Molecule3dComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Molecule3dComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Molecule3dComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', { data: '', dataType: 'uniprot', viewerOptions: { mode: 'cartoon' } });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
