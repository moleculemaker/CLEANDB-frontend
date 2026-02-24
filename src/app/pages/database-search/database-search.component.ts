import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule, FormArray, AbstractControl, ValidationErrors } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { CheckboxModule } from "primeng/checkbox";
import { ButtonModule } from "primeng/button";
import { CommonModule } from "@angular/common";
import { MenuItem } from "primeng/api";

import { CleanDbService } from '~/app/services/clean-db.service';
import { PanelModule } from "primeng/panel";
import { QueryInputComponent } from "~/app/components/query-input/query-input.component";
import { QueryValue, SearchOption } from '~/app/models/search-options';
import { StringSearchOption } from '~/app/models/search-options/StringSearchOption';
import { TableModule } from "primeng/table";
import { ChipModule } from "primeng/chip";
import { DialogModule } from "primeng/dialog";
import { MultiSelectModule } from "primeng/multiselect";
import { InputTextModule } from "primeng/inputtext";
import { MenuModule } from "primeng/menu";
import { trigger } from "@angular/animations";
import { animate } from "@angular/animations";
import { style, transition } from "@angular/animations";
import { DropdownModule } from "primeng/dropdown";
import { TooltipModule } from "primeng/tooltip";
import { DividerModule } from "primeng/divider";
import { FilterConfig, MultiselectFilterConfig, RangeFilterConfig } from "~/app/models/filters";
import { AppliedFilters, EMPTY_FILTERS, filtersToApiParams, hasActiveFilters } from "~/app/models/applied-filters";
import { Subscription } from "rxjs";
import { saveAs } from "file-saver";
import { format } from 'd3';
import { KineticTableComponent } from "~/app/components/kinetic-table/kinetic-table.component";
import { FilterDialogComponent } from "~/app/components/filter-dialog/filter-dialog.component";
import { CactusService } from "~/app/services/cactus.service";
import { CleanDbPredictedEC, CleanDbRecord } from "~/app/models/CleanDbRecord";

@Component({
  selector: 'app-database-search',
  templateUrl: './database-search.component.html',
  styleUrls: ['./database-search.component.scss'],
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
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CheckboxModule,
    ButtonModule,
    PanelModule,
    TableModule,
    MultiSelectModule,
    ChipModule,
    DialogModule,
    InputTextModule,
    MenuModule,
    DropdownModule,
    TooltipModule,
    DividerModule,

    KineticTableComponent,
    FilterDialogComponent,
    QueryInputComponent,
    TooltipModule,
],
  host: {
    class: "flex flex-col h-full"
  }
})
export class DatabaseSearchComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild(QueryInputComponent) queryInputComponent!: QueryInputComponent;

  logicalOperators = [
    { label: 'AND', value: 'AND' },
    { label: 'OR', value: 'OR' },
    { label: 'NOT', value: 'NOT' }
  ];

  form = new FormGroup({
    searchCriteria: new FormArray([
      new FormGroup({
        search: new FormControl<QueryValue | null>(null, [Validators.required, this.validateValue.bind(this)]),
        operator: new FormControl<string>('AND')
      })
    ])
  });

  get searchCriteriaControls() {
    return (this.form.get('searchCriteria') as FormArray).controls as FormGroup[];
  }

  result: {
    status: 'loading' | 'loaded' | 'error' | 'na';
    data: any[];
    total: number;
    offset: number;
  } = {
    status: 'na',
    data: [],
    total: 0,
    offset: 0,
  };

  pageSize = 10;
  currentSortField: string | null = null;
  currentSortOrder: number = 0; // 0 = unsorted, 1 = asc, -1 = desc

  appliedFilters: AppliedFilters = { ...EMPTY_FILTERS };
  currentSearchQuery: any = {};
  showFilterDialog = false;

  hasActiveFilters = hasActiveFilters;

  get searchContext(): Record<string, any> {
    return { ...this.currentSearchQuery, ...filtersToApiParams(this.appliedFilters) };
  }

  showFilter = false;
  hasFilter = false;
  filters: Map<string, FilterConfig> = new Map([
    ['protein', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Protein Name',
        rawValue: 'Proteins',
      },
      placeholder: 'Select protein name',
      field: 'protein',
      options: [],
      value: [],
    })],
    ['accession', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'UniProt Accession',
        rawValue: 'UniProt Accession',
      },
      placeholder: 'Select UniProt accession',
      field: 'accession',
      options: [],
      value: [],
      matchMode: 'subset',
    })],
    ['organism', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Organism',
        rawValue: 'Organism',
      },
      placeholder: 'Select organism',
      field: 'organism',
      options: [],
      value: [],
    })],
    ['curation status', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Curation Status',
        rawValue: 'Curation Status',
      },
      placeholder: 'Select curation status',
      field: 'curation_status',
      options: [],
      value: [],
    })],
    ['predicted_ec', new RangeFilterConfig({
      category: 'parameter',
      label: {
        value: 'Predicted EC Number (Score)',
        rawValue: 'Predicted EC Number (Score)',
      },
      placeholder: 'Enter predicted EC number (score) range',
      field: 'predicted_ec',
      min: 0,
      max: 1,
      value: [0, 1],
      matchMode: 'subset',
    })],
  ] as [string, FilterConfig][])

  searchConfigs: SearchOption[] = [
    new StringSearchOption({
      key: 'protein_name',
      label: 'Protein Name',
      placeholder: 'Enter Protein Name (minimum 3 characters)',
      example: {
        label: 'Catabolic 3-dehydroquinase',
        value: 'Catabolic 3-dehydroquinase'
      }
    }),
    new StringSearchOption({
      key: 'gene_name',
      label: 'Gene',
      placeholder: 'Enter Gene Name (minimum 3 characters)',
      example: {
        label: 'nbaC',
        value: 'nbaC'
      }
    }),
    new StringSearchOption({
      key: 'accession',
      label: 'UniProt Accession',
      placeholder: 'Enter UniProt Accession (minimum 3 characters)',
      example: {
        label: 'Q9S9U6',
        value: 'Q9S9U6'
      }
    }),
    new StringSearchOption({
      key: 'organism',
      label: 'Organism',
      placeholder: 'Enter Organism Name (minimum 3 characters)',
      example: {
        label: '<span style="font-style: italic">Escherichia coli</span>',
        value: 'Escherichia coli',
      }
    }),
    new StringSearchOption({
      key: 'ec_number',
      label: 'EC Number',
      placeholder: 'Enter EC Number or EC Name (minimum 3 characters)',
      example: {
        label: '4.1.1.1',
        value: '4.1.1.1'
      },
    }),
  ];

  columns: { field: string, header: string }[] = [];

  exampleRecords: MenuItem[] = [];
  readonly filterRecordsByCategory = Object.entries(this.filters)
    .reduce((acc, [key, filter]) => {
      if (!acc[filter.category]) {
        acc[filter.category] = [filter];
      } else {
        acc[filter.category].push(filter);
      }
      return acc;
    }, {} as Record<string, FilterConfig[]>);

  readonly filterRecords = Object.values(this.filters);
  
  private formSubscription: Subscription | null = null;
  private dataSubscription: Subscription | null = null;
 
  constructor(
    public service: CleanDbService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private cactusService: CactusService,
  ) {}

  ngOnInit(): void {
    const search = this.route.snapshot.queryParams['search'];
    if (search) {
      const searchCriteria = JSON.parse(decodeURIComponent(search));
      this.applySearchCriteriaFromParams(searchCriteria);
    }

    // Subscribe to form changes to clear result when search criteria changes
    this.formSubscription = this.form.valueChanges.subscribe(() => {
      // Only clear if we have results and the form is valid
      if (this.result.status === 'loaded' && this.form.valid) {
        this.clearResult();
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
      this.formSubscription = null;
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      this.dataSubscription = null;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.exampleRecords = this.queryInputComponent.searchOptions
        .filter((option) => option.example)
        .map((option) => ({
          label: `${option.label} (${option.example['label']})`,
          escape: false,
          command: () => this.queryInputComponent.useExample(option.key)
        }));
    });
  }

  addCriteria() {
    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    const newCriteria = new FormGroup({
      search: new FormControl<QueryValue | null>(null, [Validators.required, this.validateValue.bind(this)]),
      operator: new FormControl<string>('AND')
    });
    criteriaArray.push(newCriteria);
  }

  removeCriteria(index: number) {
    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    if (criteriaArray.length > 1) {
      criteriaArray.removeAt(index);
    }
  }

  clearAll() {
    this.clearResult();
    this.appliedFilters = { ...EMPTY_FILTERS };
    this.currentSearchQuery = {};
    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    criteriaArray.clear();
    setTimeout(() => {
      this.addCriteria();
    });
    // this.submit(true); TODO revisit this later--was this something we wanted?

    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      queryParamsHandling: 'merge'
    });
  }

  viewAllData() {
    this.clearAll();
    this.submit(true);
  }

  onAutocompleteSelected() {
    // When an autocomplete option is selected, we can submit the form immediately
    this.submit(true);
  }

  submit(force: boolean = false) {
    if (this.form.invalid && !force) {
      return;
    }

    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    if (criteriaArray.length === 0 && !force) {
      return;
    }

    // Reset sort and loading state
    this.currentSortField = null;
    this.currentSortOrder = 0;
    this.result = {
      status: 'loading',
      data: [],
      total: 0,
      offset: 0,
    };
    
    // Trigger change detection to show loading state
    this.cdr.detectChanges();

    // Build the query from multiple criteria
    let query: any = {};
    
    for (let i = 0; i < criteriaArray.length; i++) {
      const criteria = criteriaArray.at(i).value;
      const search = criteria.search;
      
      if (!search) continue;
      
      let criteriaQuery: any = {};
      
      // Build query for this criteria
      switch (search.selectedOption) {
        case 'ec_number':
          criteriaQuery = {
            ec_number: search.value,
          };
          break;
        case 'protein_name':
          criteriaQuery = {
            protein: search.value,
          };
          break;
        case 'accession':
          criteriaQuery = {
            accession: search.value,
          };
          break;
        case 'organism':
          criteriaQuery = {
            organism: search.value,
          };
          break;
        case 'gene_name':
          criteriaQuery = {
            gene_name: search.value,
          };
          break;
        default:
          break;
      }
      
      // For the first criteria, just use it directly
      if (i === 0) {
        query = criteriaQuery;
      } else {
        // For subsequent criteria, combine with appropriate operator
        const operator = criteria.operator;
        
        if (operator === 'AND') {
          // Merge criteriaQuery into query (AND logic)
          query = { ...query, ...criteriaQuery };
        } else if (operator === 'OR') {
          // Create OR condition
          query = { $or: [query, criteriaQuery] };
        } else if (operator === 'NOT') {
          // Create NOT condition for this criteria
          query = { 
            $and: [
              query, 
              { $not: criteriaQuery }
            ] 
          };
        }
      }
    }

    // Update URL with search criteria
    this.updateUrlWithSearchCriteria(criteriaArray.value);

    // Store the search query for filter operations
    this.currentSearchQuery = query;

    // Fetch data with current filters
    this.fetchData(0, this.pageSize);
  }

  fetchData(offset: number, limit: number): void {
    const ordering = this.buildOrdering();
    const combinedQuery: any = {
      ...this.currentSearchQuery,
      ...filtersToApiParams(this.appliedFilters),
      offset,
      limit,
    };
    if (ordering) {
      combinedQuery.ordering = ordering;
    }

    this.result = {
      status: 'loading',
      data: this.result.data,
      total: this.result.total,
      offset: this.result.offset,
    };
    this.cdr.detectChanges();

    // Cancel any in-flight request
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = this.service.getData(combinedQuery)
      .subscribe({
        next: (response: any) => {
          this.updateFilterOptions(response.data);

          this.result = {
            status: 'loaded',
            data: response.data,
            total: response.total,
            offset: response.offset ?? offset,
          };
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.result = {
            status: 'error',
            data: [],
            total: 0,
            offset: 0,
          };
          this.cdr.detectChanges();
        }
      });
  }

  onPageChange(event: { offset: number; limit: number; sortField: string | null; sortOrder: number }): void {
    if (this.result.status === 'loading') {
      return;
    }

    const sortChanged = event.sortField !== this.currentSortField || event.sortOrder !== this.currentSortOrder;

    this.currentSortField = event.sortField;
    this.currentSortOrder = event.sortOrder;
    this.pageSize = event.limit;

    // Sort change affects the entire result set, so reset to page 1
    const offset = sortChanged ? 0 : event.offset;
    this.fetchData(offset, event.limit);
  }

  onApplyFilters(filters: AppliedFilters): void {
    this.appliedFilters = filters;
    this.showFilterDialog = false;
    this.fetchData(0, this.pageSize);
  }

  onRemoveFilter(filterKey: keyof AppliedFilters): void {
    if (Array.isArray(this.appliedFilters[filterKey])) {
      (this.appliedFilters[filterKey] as string[]) = [];
    } else {
      (this.appliedFilters[filterKey] as any) = null;
    }
    if (filterKey === 'confidence_min' || filterKey === 'confidence_max') {
      this.appliedFilters.confidence_category = null;
      this.appliedFilters.confidence_min = null;
      this.appliedFilters.confidence_max = null;
    }
    this.fetchData(0, this.pageSize);
  }

  onClearAllFilters(): void {
    this.appliedFilters = { ...EMPTY_FILTERS };
    this.fetchData(0, this.pageSize);
  }

  exportTable() {
    if (this.result.status !== 'loaded' || this.result.data.length === 0) {
      console.warn('Export called when no data available');
      return;
    }

    const exportColumns = [
      { field: 'protein', header: 'Protein Name' },
      { field: 'accession', header: 'UniProt Accession' },
      { field: 'amino_acids', header: 'Amino Acids' },
      { field: 'organism', header: 'Organism' },
      { field: 'curation_status', header: 'Curation Status' },
      { field: 'predicted_ec', header: 'Predicted EC Numbers (Scores)' }
    ];
    const exportData = [
      exportColumns.map(col => col.header).join(','),
      ...this.result.data.map((row: CleanDbRecord) => {
        return exportColumns.map((col) => {
          if (col.field === 'predicted_ec') {
            return row[col.field].map((ec: CleanDbPredictedEC) => `${ec.ec_number} (${format('.4f')(ec.score)})`).join(' / ');
          }
          return row[col.field as keyof CleanDbRecord] as string;
        }).join(',');
      })
    ].join('\n');

    const blob = new Blob([exportData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'cleandb_export.csv');
  }

  // Helper method to match a row against all criteria
  private matchesSearchCriteria(row: CleanDbRecord, criteriaArray: FormArray): boolean {    
    // FIXME temporarily disabling frontend searching, because it needs to be updated to work with the API
    return true;
    let matches = true;
    let prevMatch = true;
    
    for (let i = 0; i < criteriaArray.length; i++) {
      const criteria = criteriaArray.at(i).value;
      const search = criteria.search;
      
      if (!search) continue;
      
      let currentMatch = false;
      
      // Check if this criteria matches
      switch (search.selectedOption) {
        case 'protein_name':
          currentMatch = row.protein.toLowerCase() === search.value.toLowerCase();
          break;
        case 'ec_number':
          currentMatch = row.predicted_ec.some((ec: CleanDbPredictedEC) =>
            ec.ec_number.toLowerCase() === search.value.toLowerCase()
          );
          break;
        case 'organism':
          currentMatch = row.organism.toLowerCase() === search.value.toLowerCase();
          break;
        case 'uniprot':
          currentMatch = row.uniprot.toLowerCase() === search.value.toLowerCase();
          break;
        case 'gene_name':
          currentMatch = row.gene_name.toLowerCase() === search.value.toLowerCase();
          break;
        default:
          currentMatch = true;
          break;
      }
      
      // For the first criteria, initialize matches with the result
      if (i === 0) {
        matches = currentMatch;
        prevMatch = currentMatch;
      } else {
        // For subsequent criteria, combine based on operator
        const operator = criteria.operator;
        
        if (operator === 'AND') {
          matches = matches && currentMatch;
        } else if (operator === 'OR') {
          matches = matches || currentMatch;
        } else if (operator === 'NOT') {
          // NOT means previous must match and current must not
          matches = prevMatch && !currentMatch;
        }
        
        prevMatch = currentMatch;
      }
    }
    
    return matches;
  }
  
  private buildOrdering(): string | null {
    if (!this.currentSortField || this.currentSortOrder === 0) {
      return null;
    }
    const prefix = this.currentSortOrder === -1 ? '-' : '';
    return `${prefix}${this.currentSortField}`;
  }

  // Update filter options based on response data
  private updateFilterOptions(response: any[]) {
    Object.entries(this.filters).forEach(([key, filter]) => {
      if (filter instanceof RangeFilterConfig) {
        filter.min = 0;
        filter.max = 1;
        const defaultRange: [number, number] = [filter.min, filter.max];
        filter.defaultValue = defaultRange;
        if (!filter.hasFilter()) {
          filter.value = [...defaultRange];
        }
      }
    });
    
    this.columns = Object.values(this.filters).map((filter) => ({
      field: filter.field,
      header: filter.label.rawValue,
    }));
  }

  // Update URL with search criteria
  private updateUrlWithSearchCriteria(searchCriteria: any[]): void {
    // Only include criteria that have search values
    const validCriteria = searchCriteria.filter(criteria => criteria.search);
    console.log(validCriteria);
    
    if (validCriteria.length > 0) {
      // Convert search criteria to URL-safe format
      const searchParam = encodeURIComponent(JSON.stringify(validCriteria));
      
      // Update URL without triggering navigation
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: searchParam },
        queryParamsHandling: 'merge'
      });
    } else {
      // If no valid criteria, remove search parameter
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  // Clear the result when search criteria changes
  private clearResult(): void {
    this.result = {
      status: 'na',
      data: [],
      total: 0,
      offset: 0,
    };
  }

  // Apply search criteria from URL parameters
  private applySearchCriteriaFromParams(searchCriteria: any[]): void {
    if (!searchCriteria || !Array.isArray(searchCriteria) || searchCriteria.length === 0) {
      return;
    }

    // Clear existing criteria
    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    criteriaArray.clear();

    // Add criteria from URL parameters
    searchCriteria.forEach((criteria, index) => {
      if (index > 0) {
        // Add operator for criteria after the first one
        const prevCriteria = criteriaArray.at(criteriaArray.length - 1).value;
        prevCriteria.operator = criteria.operator || 'AND';
      }

      // Add new criteria
      const newCriteria = new FormGroup({
        search: new FormControl<QueryValue | null>(criteria.search, [Validators.required]),
        operator: new FormControl<string>(criteria.operator || 'AND')
      });
      criteriaArray.push(newCriteria);
    });

    // If no criteria were added, add a default one
    if (criteriaArray.length === 0) {
      this.addCriteria();
    }

    // Clear result before submitting
    this.clearResult();

    // Submit the search
    this.submit(true);
  }

  private validateValue(control: AbstractControl): ValidationErrors | null {
    if (!control.value?.value) {
      return { required: true };
    }
    return null;
  }
}
