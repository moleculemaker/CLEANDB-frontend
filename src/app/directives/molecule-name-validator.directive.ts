import { Directive, EventEmitter, Output } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable, of, tap, startWith, distinctUntilChanged, debounceTime, switchMap, filter, map, first } from 'rxjs';
import { CommonService } from '../services/common.service';
import { Loadable } from '../services/openenzymedb.service';
import { CactusService } from '../services/cactus.service';

@Directive({
  selector: '[appMoleculeNameValidator]',
  standalone: true
})
export class MoleculeNameValidatorDirective {
  @Output() onMoleculeNameValidationStatusChange = new EventEmitter<Loadable<string>>();

  constructor(
    private cactusService: CactusService,
    private commonService: CommonService
  ) { }

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value || control.value.trim() === '') {
      this.onMoleculeNameValidationStatusChange.emit({
        status: 'na',
        data: null
      });
      return of({ required: true });
    }
    return control.valueChanges.pipe(
      tap(() => {
        this.onMoleculeNameValidationStatusChange.emit({
          status: 'loading',
          data: null
        })
      }),
      startWith(control.value),
      distinctUntilChanged(),
      debounceTime(300),
      switchMap(() => this.cactusService.getSMILESFromName(control.value)),
      filter((result: Loadable<string>) => 
          result.status === 'loaded' 
        || result.status === 'error' 
        || result.status === 'invalid'
      ),
      map((result: Loadable<string>) => {
        this.onMoleculeNameValidationStatusChange.emit(result);
        if (result.status === 'error' || result.status === 'invalid') {
          return { invalidName: true };
        }
        return null;
      }),
      first()
    );
  }
}
