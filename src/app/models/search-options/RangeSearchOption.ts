import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseSearchOptionParams, BaseSearchOption, SearchOptionType } from './BaseSearchOption';

type RangeSearchOptionParams = Omit<BaseSearchOptionParams, 'type'> & {
  example: Record<string, any>;
  min?: number;
  max?: number;
};

type RangeSearchAdditionalControls = {
  valueLabel: FormControl<string | null>;
};

type RangeSearchOptionType = SearchOptionType<[number, number], RangeSearchAdditionalControls>;

export class RangeSearchOption extends BaseSearchOption<[number, number], RangeSearchAdditionalControls> {
  override formGroup: FormGroup<RangeSearchOptionType> = new FormGroup({
    value: new FormControl<[number, number] | null>(null, [Validators.required]),
    valueLabel: new FormControl<string | null>(null, [Validators.required]),
  });
  
  min?: number;
  max?: number;

  constructor(params: RangeSearchOptionParams) {
    super({
      ...params,
      type: 'range',
    });
    this.formGroup.setControl('value', new FormControl<[number, number] | null>(null, [Validators.required]));
    this.formGroup.setControl('valueLabel', new FormControl<string | null>(null, [Validators.required]));
    this.min = params.min;
    this.max = params.max;

    this.formGroup.get('valueLabel')!.valueChanges.subscribe((label) => {
      this.updateValueFromLabel(label);
    });

    this.formGroup.get('value')!.valueChanges.subscribe((value) => {
      this.updateLabelFromValue(value);
    });
  }

  private updateLabelFromValue(value: [number, number] | null) {
    console.log('[query-input] updating label from value', value);
    if (!value) {
      this.formGroup.get('valueLabel')!.setValue(null, { emitEvent: false, onlySelf: true });
      return;
    }

    this.formGroup.get('valueLabel')!.setValue(
      `${value[0]}-${value[1]}`,
      { emitEvent: false, onlySelf: true }
    );
  }

  private updateValueFromLabel(label: string | null) {
    if (!label) {
      this.formGroup.get('value')!.setValue(null, { emitEvent: false, onlySelf: true });
      return;
    }

    const matches = [...label.matchAll(/^(-?\d+)-(-?\d+)$/g)][0];
    if (matches && matches.length === 3) {
      const [_, min, max] = matches.map(Number);
      this.formGroup.get('value')!.setValue([min, max], { emitEvent: false, onlySelf: true });
      console.log('[query-input] updated value from label', label, [min, max]);
    } else {
      this.formGroup.get('value')!.setValue(null, { emitEvent: false, onlySelf: true });
      console.error('[query-input] invalid label', label);
    }
  }
}
