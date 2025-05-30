import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, OnInit, OnDestroy } from "@angular/core";
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule, FormArray, AbstractControl, ValidationErrors } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { CheckboxModule } from "primeng/checkbox";
import { ButtonModule } from "primeng/button";
import { CommonModule } from "@angular/common";

import { CleanDbService } from '~/app/services/clean-db.service';
import { PanelModule } from "primeng/panel";
import { QueryInputComponent } from "~/app/components/query-input/query-input.component";
import { QueryValue, SearchOption, SmilesSearchOption } from '~/app/models/search-options';
import { RangeSearchOption } from '~/app/models/search-options/RangeSearchOption';
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
import { Subscription, map } from "rxjs";
import { KineticTableComponent } from "~/app/components/kinetic-table/kinetic-table.component";
import { CactusService } from "~/app/services/cactus.service";
import { CleanDbRecord } from "~/app/models/CleanDbRecord";

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
    QueryInputComponent,
],
  host: {
    class: "flex flex-col h-full"
  }
})
export class DatabaseSearchComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild(QueryInputComponent) queryInputComponent!: QueryInputComponent;
  @ViewChild(KineticTableComponent) kineticTable!: KineticTableComponent;

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
  } = {
    status: 'na',
    data: [],
    total: 0,
  };

  showFilter = false;
  hasFilter = false;
  filters: Map<string, FilterConfig> = new Map([
    ['protein', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Proteins',
        rawValue: 'Proteins',
      },
      placeholder: 'Select protein',
      field: 'protein',
      options: [],
      value: [],
    })],
    ['uniprot_ids', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Uniprot',
        rawValue: 'Uniprot',
      },
      placeholder: 'Select Uniprot ID',
      field: 'uniprot',
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
    ['predicted_ec', new MultiselectFilterConfig({
      category: 'parameter',
      label: {
        value: 'Predicted EC Number (Score)',
        rawValue: 'Predicted EC Number (Score)',
      },
      placeholder: 'Enter predicted EC number (score) range',
      field: 'predicted_ec',
      options: [],
      value: [],
      matchMode: 'subset',
    })],
  ] as [string, FilterConfig][])

  searchConfigs: SearchOption[] = [
    new StringSearchOption({
      key: 'protein_name',
      label: 'Protein Name',
      placeholder: 'Free fatty acid receptor 2',
      example: {
        label: 'Free fatty acid receptor 2',
        value: 'Free fatty acid receptor 2'
      }
    }),
    new StringSearchOption({
      key: 'gene_id',
      label: 'Gene',
      placeholder: 'Enter Gene Name',
      example: {
        label: 'FAR2',
        value: 'FAR2'
      }
    }),
    new StringSearchOption({
      key: 'uniprot',
      label: 'Uniprot ID',
      placeholder: 'Enter Uniprot ID',
      example: {
        label: 'P05655',
        value: 'P05655'
      }
    }),
    new StringSearchOption({
      key: 'organism',
      label: 'Organism',
      placeholder: 'Enter organism name',
      example: {
        label: 'Lentzea aerocolonigenes',
        value: 'Lentzea aerocolonigenes'
      }
    }),
    new StringSearchOption({
      key: 'ec_number',
      label: 'EC Number',
      placeholder: 'Enter EC Number',
      example: {
        label: '5.1.1.1',
        value: '5.1.1.1'
      },
    }),
  ];

  columns: any[] = [];

  exampleRecords: any[] = [];
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
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.exampleRecords = this.queryInputComponent.searchOptions
        .filter((option) => option.example)
        .map((option) => ({
          label: `${option.label} (${option.example['label']})`,
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
    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    criteriaArray.clear();
    setTimeout(() => {
      this.addCriteria();
    });
    this.submit(true);
    
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

  submit(force: boolean = false) {
    if (this.form.invalid && !force) {
      return;
    }

    const criteriaArray = this.form.get('searchCriteria') as FormArray;
    if (criteriaArray.length === 0 && !force) {
      return;
    }

    // Set loading state
    this.result = {
      status: 'loading',
      data: [],
      total: 0,
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
        case 'uniprot':
          criteriaQuery = {
            uniprot: search.value,
          };
          break;
        case 'organism':
          criteriaQuery = {
            organism: search.value,
          };
          break;
        case 'gene_id':
          criteriaQuery = {
            gene_id: search.value,
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

    // Use the existing getResult method
    // For the prototype, we'll use a fixed JobType.Defaults and dummy job ID
    // In a real implementation, this would send the query to the backend first

    // TODO: implement this
    this.service.getData()
      .pipe(
        map((response: CleanDbRecord[]) => 
          response
            .filter((row) => {
              // Process multi-criteria filtering client-side
              return this.matchesSearchCriteria(row, criteriaArray);
            })
        )
      )
      .subscribe({
        next: (response: CleanDbRecord[]) => {
          // Update options for filters
          this.updateFilterOptions(response);
          
          this.result = {
            status: 'loaded',
            data: response,
            total: response.length,
          };
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.result = {
            status: 'error',
            data: [],
            total: 0,
          };
          this.cdr.detectChanges();
        }
      });
  }

  // Helper method to match a row against all criteria
  private matchesSearchCriteria(row: any, criteriaArray: FormArray): boolean {
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
          currentMatch = row.predicted_ec.some((ec: string) => ec.toLowerCase() === search.value.toLowerCase());
          break;
        case 'organism':
          currentMatch = row.organism.toLowerCase() === search.value.toLowerCase();
          break;
        case 'uniprot':
          currentMatch = row.uniprot.toLowerCase() === search.value.toLowerCase();
          break;
        case 'gene_id':
          currentMatch = row.gene_id.toLowerCase() === search.value.toLowerCase();
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
  
  // Update filter options based on response data
  private updateFilterOptions(response: any[]) {
    function getField(obj: any, dotPath: string) {
      return dotPath.split('.').reduce((obj, key) => obj[key], obj);
    }
    
    Object.entries(this.filters).forEach(([key, filter]) => {
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
