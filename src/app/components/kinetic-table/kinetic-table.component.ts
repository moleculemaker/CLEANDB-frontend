import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PanelModule } from 'primeng/panel';
import { Table, TableModule, TableRowExpandEvent } from 'primeng/table';
import { animate } from '@angular/animations';
import { style, transition } from '@angular/animations';
import { trigger } from '@angular/animations';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ToastModule } from 'primeng/toast';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';

import { CleanDbService } from '~/app/services/clean-db.service';
import { LoadingStatus } from '~/app/models/Loadable';
import { EcChipComponent } from '../ec-chip/ec-chip.component';
import { EcArrowComponent } from '../ec-arrow/ec-arrow.component';
import { ReactionSchemaComponent } from '../reaction-schema/reaction-schema.component';
import { catchError, of } from 'rxjs';
import { map } from 'rxjs';
import { ReactionSchemaRecord } from '~/app/models/ReactionSchemaRecord';

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
    ToastModule,
    TabViewModule,

    EcArrowComponent,
    EcChipComponent,
    ReactionSchemaComponent,
  ],
  providers: [MessageService],
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
  @Input() filters: Map<string, any> = new Map();
  @Input() isFiltered = false;

  @ViewChild(Table) resultsTable!: Table;

  columns = [
    { field: 'accession', header: 'UniProt Accession' },
    { field: 'amino_acids', header: 'Amino Acids' },
    { field: 'organism', header: 'Organism' },
    { field: 'curation_status', header: 'Curation Status' },
    { field: 'predicted_ec', header: 'Predicted EC Number (Score)' },
  ];
  reactionSchemaCache: Record<string, {
    status: LoadingStatus;
    data: ReactionSchemaRecord | null;
  }> = {};

  constructor(
    private service: CleanDbService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // React to result changes if needed
  }

  onRowExpand($event: TableRowExpandEvent) {
    const { data } = $event;
    const key = data.predicted_ec[0].ec_number;
    this.onReactionSchemaTagClicked(key);
  }

  onReactionSchemaTagClicked(ec_number: string | undefined) {
    if (!ec_number) {
      return;
    }

    if (this.reactionSchemaCache[ec_number]) {
      return;
    }

    this.reactionSchemaCache[ec_number] = {
      status: 'loading',
      data: null,
    };

    this.service.getReactionSchemaForEc(ec_number)
      .pipe(
        map(schema => ({
          status: (schema
            ? ('loaded' as const)
            : ('na' as const)),
          data: schema
        })),
        catchError(error => {
          console.error('Failed to fetch reaction schemas:', error);
          return of({
            status: 'error' as const,
            data: null
          });
        })
      )
      .subscribe((result) => {
        this.reactionSchemaCache[ec_number] = result;
      });
  }

  copySequence(sequence: string) {
    if (sequence) {
      navigator.clipboard.writeText(sequence);
    }
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Sequence copied to clipboard',
    });
  }
}
