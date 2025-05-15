import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PanelModule } from 'primeng/panel';
import { ExportCSVOptions, Table, TableModule, TableRowExpandEvent } from 'primeng/table';
import { FilterConfig, MultiselectFilterConfig, RangeFilterConfig } from '~/app/models/filters';
import { FilterService } from 'primeng/api';
import { animate } from '@angular/animations';
import { style, transition } from '@angular/animations';
import { trigger } from '@angular/animations';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { CleanDbService } from '~/app/services/clean-db.service';
import { LoadingStatus } from '~/app/models/Loadable';
import { EcChipComponent } from '../ec-chip/ec-chip.component';
import { FilterDialogComponent } from '../filter-dialog/filter-dialog.component';

@Component({
  selector: 'app-kinetic-table',
  standalone: true,
  animations: [
    trigger(
      'slideIn', 
      [
        transition(
          ':enter', 
          [
            style({ maxHeight: 0 }),
            animate('.5s ease-out', 
                    style({ maxHeight: 800 }))
          ]
        )
      ]
    )
  ],
  imports: [
    PanelModule,
    TableModule,
    CommonModule,
    RouterLink,
    SkeletonModule,
    ScrollPanelModule, 
    EcChipComponent,
    FilterDialogComponent,
  ],
  templateUrl: './kinetic-table.component.html',
  styleUrl: './kinetic-table.component.scss'
})
export class KineticTableComponent implements OnChanges {
  @Input() result: {
    status: 'loading' | 'loaded' | 'error' | 'na';
    data: any[];
    total: number;
  } = {
    status: 'na',
    data: [],
    total: 0,
  };
  @Input() filters: Map<string, FilterConfig> = new Map();

  @ViewChild(Table) resultsTable!: Table;

  columns: any[] = [];
  reactionSchemaCache: Record<string, {
    status: LoadingStatus;
    data: any[]; // TODO: fix this
  }> = {};

  showFilter = false;
  hasFilter = false;

  get filterRecords() {
    return Array.from(this.filters.values());
  }

  constructor(
    private filterService: FilterService,
    private service: CleanDbService,
  ) {
    this.filterService.register(
      "range",
      (value: number, filter: [number, number]) => {
        if (!filter) {
          return true;
        }
        return value >= filter[0] && value <= filter[1];
      },
    );

    this.filterService.register(
      "subset",
      (value: any[], filter: any[]) => {
        if (!filter) {
          return true;
        }
        return filter.every((f) => value.includes(f));
      },
    );

    this.updateFilterOptions(this.result.data);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result'] && this.result.data) {
      this.updateFilterOptions(this.result.data);
    }
  }

  export(options?: ExportCSVOptions) {
    this.resultsTable.exportCSV(options);
  }

  clearAllFilters() {
    this.showFilter = false;
    this.filterRecords.forEach((filter) => {
      filter.value = filter.defaultValue;
    });
    if (this.resultsTable) {
      this.applyFilters();
    }
  }

  applyFilters() {
    this.showFilter = false;
    this.filterRecords.forEach((filter) => {
      this.resultsTable.filter(filter.value, filter.field, filter.matchMode);
    });
    this.hasFilter = this.filterRecords.some((filter) => filter.hasFilter());
  }

  searchTable(filter: FilterConfig): void {
    this.resultsTable.filter(filter.value, filter.field, filter.matchMode);
    this.hasFilter = this.filterRecords.some(f => f.hasFilter());
  }

  onRowExpand($event: TableRowExpandEvent) {
    const { data } = $event;
    const { ec_number, compound, organism } = data;
    const key = `${ec_number}|${compound.name}|${organism}`;
    if (this.reactionSchemaCache[key]) {
      return;
    }
    this.reactionSchemaCache[key] = {
      status: 'loading',
      data: [],
    };
    // this.service.getReactionSchemasFor(ec_number, compound.name, organism)
    //   .pipe(
    //     map(schemas => ({
    //       status: (schemas && schemas.length > 0 
    //         ? ('loaded' as const) 
    //         : ('na' as const)),
    //       data: schemas
    //     })),
    //     catchError(error => {
    //       console.error('Failed to fetch reaction schemas:', error);
    //       return of({
    //         status: 'error' as const,
    //         data: []
    //       });
    //     })
    //   )
    //   .subscribe((result) => {
    //     this.reactionSchemaCache[key] = result;
    //   });
  }

  private updateFilterOptions(response: any[]) {
    function getField(obj: any, dotPath: string) {
      return dotPath.split('.').reduce((obj, key) => obj[key], obj);
    }
    
    Array.from(this.filters.entries()).forEach(([key, filter]) => {
      const options = response.map((row: any) => getField(row, filter.field)).flat();
      const optionsSet = new Set(options);
      if (filter instanceof MultiselectFilterConfig) {
        filter.options = Array.from(optionsSet).map((option: any) => ({
          label: option,
          value: option,
        }));
        filter.defaultValue = [];
      } else if (filter instanceof RangeFilterConfig) {
        filter.min = Math.min(...options);
        filter.max = Math.max(...options);
        filter.value = [filter.min, filter.max];
        filter.defaultValue = [filter.min, filter.max];
      }
    });
    
    this.columns = Array.from(this.filters.values()).map((filter) => ({
      field: filter.field,
      header: filter.label.rawValue,
    }));
  }
}
