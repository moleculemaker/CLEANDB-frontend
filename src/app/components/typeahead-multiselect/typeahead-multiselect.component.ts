import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule, AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { CleanDbService } from '~/app/services/clean-db.service';

export interface TypeaheadOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-typeahead-multiselect',
  standalone: true,
  imports: [AutoCompleteModule, FormsModule, CommonModule],
  template: `
    <div class="typeahead-multiselect">
      <p-autoComplete
        #autocomplete
        [multiple]="true"
        [suggestions]="suggestions"
        [placeholder]="placeholder"
        [minLength]="1"
        [delay]="300"
        field="label"
        [(ngModel)]="selectedItems"
        (completeMethod)="onSearch($event)"
        (onSelect)="onItemChange()"
        (onUnselect)="onItemChange()"
        (onShow)="onPanelShow()"
        (onHide)="onPanelHide()"
        styleClass="w-full"
        panelStyleClass="typeahead-panel"
        [showEmptyMessage]="true"
        [emptyMessage]="emptyMessage"
        appendTo="body"
        [baseZIndex]="10000"
      >
        <ng-template let-item pTemplate="item">
          <div class="flex items-center">
            <span>{{ item.label }}</span>
          </div>
        </ng-template>
        <ng-template let-item pTemplate="selectedItem">
          <span class="text-sm">{{ item.label }}</span>
        </ng-template>
      </p-autoComplete>
      @if (loading && suggestions.length > 0) {
        <div class="text-center py-1 text-sm text-gray-500">Loading more...</div>
      }
      @if (error) {
        <div class="text-red-500 text-sm mt-1">{{ error }} <button class="underline" (click)="retry()">Retry</button></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .typeahead-multiselect {
      width: 100%;
    }
    :host ::ng-deep .p-autocomplete {
      width: 100%;
    }
    :host ::ng-deep .p-autocomplete-multiple-container {
      width: 100%;
    }
    :host ::ng-deep .typeahead-panel {
      max-height: 300px;
      overflow-y: auto;
    }
  `]
})
export class TypeaheadMultiselectComponent implements OnDestroy, AfterViewInit {
  @ViewChild('autocomplete') autocomplete!: AutoComplete;

  @Input() fieldName = '';
  @Input() placeholder = 'Search...';
  @Input() searchContext: Record<string, any> = {};
  @Input() set selectedValues(values: string[]) {
    this.selectedItems = values.map(v => ({ label: v, value: v }));
  }

  @Output() selectedValuesChange = new EventEmitter<string[]>();

  selectedItems: TypeaheadOption[] = [];
  suggestions: TypeaheadOption[] = [];
  loading = false;
  error: string | null = null;
  emptyMessage = 'Type 3+ characters to start search';

  private currentQuery = '';
  private currentOffset = 0;
  private hasMore = true;
  private readonly pageSize = 20;
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  private panelScrollListener: (() => void) | null = null;
  private searchVersion = 0; // Track search version to handle race conditions

  constructor(private service: CleanDbService) {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(query => {
      this.executeSearch(query);
    });
  }

  ngAfterViewInit(): void {
    // Setup will happen on panel show
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    this.removePanelScrollListener();
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query;
    if (query.length < 3) {
      this.suggestions = [];
      this.emptyMessage = 'Type 3+ characters to start search';
      return;
    }
    this.emptyMessage = 'No matching found for current search';
    this.searchSubject.next(query);
  }

  onPanelShow(): void {
    setTimeout(() => {
      this.setupPanelScrollListener();
    }, 100);
  }

  onPanelHide(): void {
    this.removePanelScrollListener();
  }

  onItemChange(): void {
    this.selectedValuesChange.emit(this.selectedItems.map(item => item.value));
  }

  retry(): void {
    if (this.currentQuery) {
      this.executeSearch(this.currentQuery);
    }
  }

  private executeSearch(query: string): void {
    // Increment version to invalidate any in-flight requests
    this.searchVersion++;
    this.currentQuery = query;
    this.currentOffset = 0;
    this.hasMore = true;
    this.error = null;
    this.loading = false; // Reset loading state for new search
    this.fetchPage(true);
  }

  private fetchPage(reset: boolean): void {
    if (this.loading || (!this.hasMore && !reset)) {
      return;
    }

    this.loading = true;
    this.error = null;

    const params = {
      field_name: this.fieldName,
      search: this.currentQuery,
      limit: this.pageSize,
      offset: this.currentOffset,
      ...this.searchContext
    };

    // Capture the current version to check when response arrives
    const requestVersion = this.searchVersion;

    this.service.getTypeaheadPaginated(params).subscribe({
      next: (results) => {
        // Ignore response if a newer search has been initiated
        if (requestVersion !== this.searchVersion) {
          return;
        }
        if (reset) {
          this.suggestions = results;
        } else {
          this.suggestions = [...this.suggestions, ...results];
        }
        this.hasMore = results.length === this.pageSize;
        this.currentOffset += results.length;
        this.loading = false;
      },
      error: (err) => {
        // Ignore error if a newer search has been initiated
        if (requestVersion !== this.searchVersion) {
          return;
        }
        console.error('Typeahead error:', err);
        this.error = 'Failed to load suggestions';
        this.loading = false;
      }
    });
  }

  private setupPanelScrollListener(): void {
    this.removePanelScrollListener();

    const panel = document.querySelector('.p-autocomplete-panel');
    if (panel) {
      const scrollHandler = () => {
        const scrollTop = panel.scrollTop;
        const scrollHeight = panel.scrollHeight;
        const clientHeight = panel.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 50) {
          this.loadMore();
        }
      };

      panel.addEventListener('scroll', scrollHandler);
      this.panelScrollListener = () => {
        panel.removeEventListener('scroll', scrollHandler);
      };
    }
  }

  private removePanelScrollListener(): void {
    if (this.panelScrollListener) {
      this.panelScrollListener();
      this.panelScrollListener = null;
    }
  }

  private loadMore(): void {
    if (!this.loading && this.hasMore) {
      this.fetchPage(false);
    }
  }
}
