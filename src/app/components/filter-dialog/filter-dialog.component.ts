import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterComponent } from '../filter/filter.component';
import { DialogModule } from 'primeng/dialog';
import { FilterConfig } from '~/app/models/filters';

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
  imports: [
    DialogModule,
    FilterComponent
  ],
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.scss'
})
export class FilterDialogComponent {
  @Input() visible = false;
  @Input() filters: Map<string, FilterConfig> = new Map();
  @Input() numberResults = 0;

  @Output() filterChange = new EventEmitter<FilterConfig>();
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() clearAllFilters = new EventEmitter<void>();
  @Output() applyFilters = new EventEmitter<void>();

  get filterRecordsByCategory() {
    return Array.from(this.filters.entries())
      .reduce((acc, [key, filter]) => {
        if (!acc[filter.category]) {
          acc[filter.category] = [filter];
      } else {
        acc[filter.category].push(filter);
      }
      return acc;
    }, {} as Record<string, FilterConfig[]>);
  }
}
