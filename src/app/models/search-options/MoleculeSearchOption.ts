import { FormControl, Validators, AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of, map, first, catchError, tap, filter, switchMap, debounceTime, startWith, distinctUntilChanged } from 'rxjs';
import { BaseSearchOptionParams, BaseSearchOption, SearchOptionType } from './BaseSearchOption';
import { Loadable } from '~/app/models/Loadable';

type MoleculeSearchOptionParams = Omit<BaseSearchOptionParams, 'type'> & {
  example: Record<string, any>;
  moleculeValidator: (smiles: string) => Observable<Loadable<string>>;
};

type MoleculeSearchInputType = 'name' | 'smiles';

type MoleculeSearchAdditionalControls = {
  inputType: FormControl<MoleculeSearchInputType | null>;
  inputValue: FormControl<string | null>;
};

type MoleculeSearchOptionType = SearchOptionType<string, MoleculeSearchAdditionalControls>;

export class MoleculeSearchOption extends BaseSearchOption<string, MoleculeSearchAdditionalControls> {
  override formGroup: FormGroup<MoleculeSearchOptionType> = new FormGroup({
    inputType: new FormControl<MoleculeSearchInputType>('name', [Validators.required]),
    inputValue: new FormControl<string>('', 
      [Validators.required],
      [this.validateInput.bind(this)]
    ),
    value: new FormControl<string>('', [Validators.required]),
  });

  public chemInfo: Loadable<string> = {
    data: '',
    status: 'na'
  };

  private smilesValidator: (smiles: string) => Observable<ValidationErrors | null>;

  constructor(params: MoleculeSearchOptionParams) {
    super({
      ...params,
      type: 'molecule',
    });

    this.smilesValidator = (smiles: string) => {
      return params.moleculeValidator(smiles).pipe(
        tap((chemical) => this.chemInfo = chemical),
        filter((chemical) => chemical.status !== 'loading'),
        map((chemical) => {
          if (chemical.status === 'loaded') {
            this.formGroup.get('value')!.patchValue(chemical.data);
            console.log('[molecule-search-option] smiles validated', chemical);
            return null;
          }
          console.log('[molecule-search-option] smiles validation error', chemical);
          return { invalidSmiles: true };
        }),
      )
    };
  }

  override reset() {
    super.reset();
    this.chemInfo = {
      data: '',
      status: 'na'
    };
    this.formGroup.get('inputType')!.setValue('name', { emitEvent: false });
    this.formGroup.get('inputValue')!.setValue('', { emitEvent: false });
    this.formGroup.get('value')!.setValue('', { emitEvent: false });
  }

  private validateInput(control: AbstractControl<string | null>) {
    return control.valueChanges.pipe(
      startWith(control.value),
      tap(() => this.chemInfo.status = 'loading'),
      distinctUntilChanged(),
      tap((v) => console.log('[molecule-search-option] inputValue changed', v)),
      debounceTime(300),
      switchMap((value) => {
        if (!value) {
          return of({ required: true });
        }

        const inputType = this.formGroup.get('inputType')!.value;
        switch (inputType) {
          case 'name':
            return of(null);
          case 'smiles':
            return this.smilesValidator(value)
        }

        return of({ unknownInputType: true });
      }),
      first()
    )
  }
}
