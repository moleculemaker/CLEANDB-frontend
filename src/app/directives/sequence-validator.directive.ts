import { Directive, forwardRef } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[appSequenceValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => SequenceValidatorDirective),
      multi: true
    }
  ],
  standalone: true
})
export class SequenceValidatorDirective implements Validator {
  private maxSeqNum: number = 20;
  private validAminoAcid = new RegExp("[^GPAVLIMCFYWHKRQNEDST]", "i");
  private validDNA = new RegExp("[^ACTG]", "i");

  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return { required: true };
    }

    const sequenceData = control.value;
    const splitString: string[] = sequenceData.split('>').slice(1);
    const headers: string[] = [];
    const errors: ValidationErrors[] = [];

    // Check if sequence is empty
    if (splitString.length === 0) {
      return { noSequence: true };
    }

    // Check if exceeds max sequence number
    if (splitString.length > this.maxSeqNum) {
      return { exceedsMaxSeqNum: true };
    }

    // Check for whitespace after >
    if (splitString[0].charAt(0) === ' ') {
      return { containsWhitespace: true };
    }

    // Validate each sequence
    splitString.forEach((seq: string, index: number) => {
      const aminoHeader: string = seq.split('\n')[0];
      let aminoSeq: string = seq.split('\n').slice(1).join('');

      // Remove trailing * if present
      if (aminoSeq.slice(-1) === '*') {
        aminoSeq = aminoSeq.slice(0, -1);
      }
      aminoSeq = aminoSeq.toUpperCase();

      // Check for empty header
      if (aminoHeader.length === 0) {
        errors.push({ headerCannotBeEmpty: index });
      }

      // Check for invalid sequence
      if (this.isInvalidFasta(aminoSeq)) {
        errors.push({ invalidSequence: aminoHeader });
      }

      // Check sequence length
      if (aminoSeq.length > 1022) {
        errors.push({ sequenceLengthGreaterThan1022: aminoHeader });
      }

      if (aminoSeq.length === 0) {
        errors.push({ sequenceLengthIs0: aminoHeader });
      }

      headers.push(aminoHeader);
    });

    // Check for duplicate headers
    if (this.hasDuplicateHeaders(headers)) {
      return { duplicateHeaders: true };
    }

    // Return all validation errors if any exist
    if (errors.length > 0) {
      return { errors };
    }

    return null;
  }

  private isInvalidFasta(seq: string): boolean {
    return this.validAminoAcid.test(seq);
  }

  private hasDuplicateHeaders(array: string[]): boolean {
    return (new Set(array)).size !== array.length;
  }
} 