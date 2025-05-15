import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BaseSearchOptionParams, BaseSearchOption, SearchOptionType } from './BaseSearchOption';

type StringSearchOptionParams = Omit<BaseSearchOptionParams, 'type'> & {
  example: Record<string, any>;
};

type StringSearchAdditionalControls = {};

type StringSearchOptionType = SearchOptionType<string, StringSearchAdditionalControls>;

export class StringSearchOption extends BaseSearchOption<string, StringSearchAdditionalControls> {
  override formGroup: FormGroup<StringSearchOptionType> = new FormGroup({
    value: new FormControl<string | null>(null, [Validators.required]),
  });

  constructor(params: StringSearchOptionParams) {
    super({
      ...params,
      type: 'string',
    });
  }
}
