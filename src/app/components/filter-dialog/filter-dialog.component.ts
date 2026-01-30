import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';

import { TypeaheadMultiselectComponent } from '../typeahead-multiselect/typeahead-multiselect.component';
import { AppliedFilters, EMPTY_FILTERS, CONFIDENCE_CATEGORIES } from '~/app/models/applied-filters';
import { CleanDbService } from '~/app/services/clean-db.service';

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    MultiSelectModule,
    DropdownModule,
    InputNumberModule,
    TypeaheadMultiselectComponent
  ],
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.scss'
})
export class FilterDialogComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() appliedFilters: AppliedFilters = { ...EMPTY_FILTERS };
  @Input() searchContext: Record<string, any> = {};

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() applyFilters = new EventEmitter<AppliedFilters>();

  draft: AppliedFilters = { ...EMPTY_FILTERS };
  rangeError: string | null = null;
  curationStatusOptions: { label: string; value: string }[] = [];
  confidenceCategories = CONFIDENCE_CATEGORIES.map(c => ({ label: c.label, value: c.value }));

  constructor(private service: CleanDbService) {}

  ngOnInit(): void {
    this.loadCurationStatuses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.draft = this.cloneFilters(this.appliedFilters);
      this.rangeError = null;
    }
  }

  onCategoryChange(event: any): void {
    const category = CONFIDENCE_CATEGORIES.find(c => c.value === event.value);
    if (category) {
      this.draft.confidence_min = category.min;
      this.draft.confidence_max = category.max;
      this.rangeError = null;
    }
  }

  onRangeChange(): void {
    this.draft.confidence_category = null;
    this.validateRange();
  }

  validateRange(): void {
    if (this.draft.confidence_min != null && this.draft.confidence_max != null) {
      if (this.draft.confidence_min > this.draft.confidence_max) {
        this.rangeError = 'Min must be ≤ Max';
      } else if (this.draft.confidence_min < 0 || this.draft.confidence_max > 1) {
        this.rangeError = 'Values must be between 0.0 and 1.0';
      } else {
        this.rangeError = null;
      }
    } else {
      this.rangeError = null;
    }
  }

  resetFilters(): void {
    this.draft = { ...EMPTY_FILTERS };
    this.rangeError = null;
  }

  onApply(): void {
    if (!this.rangeError) {
      this.applyFilters.emit(this.cloneFilters(this.draft));
    }
  }

  onClose(): void {
    this.visibleChange.emit(false);
  }

  private cloneFilters(filters: AppliedFilters): AppliedFilters {
    return {
      protein: [...filters.protein],
      organism: [...filters.organism],
      curation_status: [...filters.curation_status],
      ec_number: [...filters.ec_number],
      confidence_min: filters.confidence_min,
      confidence_max: filters.confidence_max,
      confidence_category: filters.confidence_category
    };
  }

  private loadCurationStatuses(): void {
    this.service.getCurationStatuses().subscribe({
      next: (statuses) => {
        this.curationStatusOptions = statuses.map(s => ({ label: s, value: s }));
      },
      error: (err) => {
        console.error('Failed to load curation statuses:', err);
        this.curationStatusOptions = [
          { label: 'Reviewed (Swiss-Prot)', value: 'Reviewed (Swiss-Prot)' },
          { label: 'Unreviewed (TrEMBL)', value: 'Unreviewed (TrEMBL)' }
        ];
      }
    });
  }
}
