import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { ThreedmolLoaderService } from '~/app/services/threedmol-loader.service';
import { AlphafoldService } from '~/app/services/alphafold.service';
import { ProteinSelectionService } from '~/app/services/protein-selection.service';
import {
  ProteinViewerStyle,
  ProteinColorScheme,
  ResidueSelection,
} from '~/app/models/protein-viewer';

@Component({
  selector: 'app-protein-viewer',
  templateUrl: './protein-viewer.component.html',
  styleUrls: ['./protein-viewer.component.scss'],
  standalone: true,
})
export class ProteinViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() uniprotId: string = '';
  @Input() pdbData: string = '';
  @Input() dataFormat: string = 'pdb';
  @Input() style: ProteinViewerStyle = 'cartoon';
  @Input() colorScheme: ProteinColorScheme = 'spectrum';
  @Input() highlightColor: string = '#E16ACF';
  @Input() highlightedResidues: ResidueSelection[] = [];
  @Input() viewerId: string = 'default';

  @Output() residueClicked = new EventEmitter<ResidueSelection>();
  @Output() highlightedResiduesChange = new EventEmitter<ResidueSelection[]>();

  @ViewChild('viewerContainer', { read: ElementRef })
  containerRef!: ElementRef<HTMLDivElement>;

  private viewer: any = null;
  private modelLoaded = false;
  private uniprotId$ = new BehaviorSubject<string>('');
  private subscriptions: Subscription[] = [];

  constructor(
    private threeDMolLoader: ThreedmolLoaderService,
    private alphafoldService: AlphafoldService,
    private proteinSelectionService: ProteinSelectionService,
  ) {}

  ngAfterViewInit(): void {
    this.subscriptions.push(
      this.threeDMolLoader.get3DMol().pipe(
        first(),
        map($3dmol => {
          const viewer = $3dmol.createViewer(this.containerRef.nativeElement, {
            backgroundColor: 'white',
          });
          return viewer;
        }),
      ).subscribe(viewer => {
        this.viewer = viewer;
        this.loadProtein();
      }),
    );

    this.subscriptions.push(
      this.proteinSelectionService.getSelections$(this.viewerId).subscribe(selections => {
        this.applyHighlights(selections);
        this.highlightedResiduesChange.emit(selections);
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['uniprotId'] && !changes['uniprotId'].firstChange) ||
        (changes['pdbData'] && !changes['pdbData'].firstChange)) {
      this.loadProtein();
    }

    if (changes['highlightedResidues'] && !changes['highlightedResidues'].firstChange) {
      this.proteinSelectionService.setSelections(this.viewerId, this.highlightedResidues ?? []);
    }

    if (changes['style'] || changes['colorScheme']) {
      if (!changes['style']?.firstChange && !changes['colorScheme']?.firstChange) {
        this.applyBaseStyle();
        const selections = this.getCurrentSelections();
        this.applyHighlights(selections);
      }
    }

    if (changes['highlightColor'] && !changes['highlightColor'].firstChange) {
      const selections = this.getCurrentSelections();
      this.applyHighlights(selections);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.proteinSelectionService.clearSelections(this.viewerId);
    if (this.viewer) {
      this.viewer.removeAllModels();
      this.viewer.clear();
      this.viewer = null;
    }
  }

  private loadProtein(): void {
    if (!this.viewer) return;
    if (!this.pdbData && !this.uniprotId) return;
    this.modelLoaded = false;

    if (this.pdbData) {
      this.renderModel(this.pdbData);
    } else {
      this.subscriptions.push(
        this.alphafoldService.get3DProtein(this.uniprotId).subscribe({
          next: (pdbData) => this.renderModel(pdbData),
          error: (err) => {
            console.error('Failed to load protein:', err);
          },
        }),
      );
    }
  }

  private renderModel(pdbData: string): void {
    this.viewer.removeAllModels();
    this.viewer.addModel(pdbData, this.dataFormat);
    this.modelLoaded = true;
    this.setupClickHandler(this.viewer);
    this.applyBaseStyle();
    this.viewer.zoomTo();
    this.viewer.render();
    this.viewer.zoom(1, 2000);

    const selections = this.getCurrentSelections();
    if (selections.length > 0) {
      this.applyHighlights(selections);
    }
  }

  private setupClickHandler(viewer: any): void {
    viewer.setClickable({}, true, (atom: any) => {
      if (!atom) return;
      const residue: ResidueSelection = {
        resi: atom.resi,
        resn: atom.resn,
        chain: atom.chain,
      };
      this.proteinSelectionService.toggleSelection(this.viewerId, residue);
      this.residueClicked.emit(residue);
    });
  }

  private applyBaseStyle(): void {
    if (!this.viewer || !this.modelLoaded) return;

    const modeSpec: any = {};
    switch (this.colorScheme) {
      case 'spectrum':
        modeSpec.color = 'spectrum';
        break;
      case 'residue':
        modeSpec.colorscheme = 'amino';
        break;
      case 'default':
        modeSpec.color = 0x46C38B;
        break;
      default:
        modeSpec.colorscheme = this.colorScheme;
        break;
    }
    this.viewer.setStyle({}, { [this.style]: modeSpec });
    this.viewer.render();
  }

  private getHighlightSpec(): any {
    const spec: any = { color: this.highlightColor };
    switch (this.style) {
      case 'cartoon':
        spec.thickness = 2;
        spec.width = 2;
        break;
      case 'stick':
        spec.radius = 0.5;
        break;
      case 'sphere':
        spec.scale = 1.6;
        break;
      case 'line':
        spec.linewidth = 6;
        break;
    }
    return { [this.style]: spec };
  }

  private applyHighlights(selections: ResidueSelection[]): void {
    if (!this.viewer || !this.modelLoaded) return;

    this.applyBaseStyle();

    const highlightSpec = this.getHighlightSpec();
    for (const sel of selections) {
      this.viewer.addStyle(
        { resi: sel.resi, chain: sel.chain },
        highlightSpec,
      );
    }

    this.viewer.render();
  }

  private getCurrentSelections(): ResidueSelection[] {
    let selections: ResidueSelection[] = [];
    this.proteinSelectionService.getSelections$(this.viewerId).pipe(first()).subscribe(s => {
      selections = s;
    });
    return selections;
  }
}
