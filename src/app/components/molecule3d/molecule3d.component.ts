/**
 * Business Rules for Molecule3D Component:
 * 
 * 1. Image Display Mode:
 *    - When enabled, the component will first render the 3D molecule and capture its image
 *    - The captured image will be displayed instead of the interactive 3D model
 *    - A play icon overlay will be shown on the image to indicate interactivity
 * 
 * 2. Image Capture:
 *    - The molecule image is always captured regardless of display mode
 *    - This ensures quick switching between image and 3D modes
 * 
 * 3. Interactive Mode:
 *    - Users can click on the image to switch to interactive 3D mode
 *    - The 3D model will be rendered on demand to save resources
 * 
 * 4. Optional Feature:
 *    - Image display mode is controlled via input options
 *    - When disabled, the component behaves as a standard 3D viewer
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  Output,
  EventEmitter
} from "@angular/core";
import { ThreedmolLoaderService } from "~/app/services/threedmol-loader.service";
import { BehaviorSubject, Subscription, Observable } from "rxjs";
import { combineLatestWith, distinctUntilChanged, filter, first, map, mergeMap, switchMap } from "rxjs/operators";
import { PubchemService } from "~/app/services/pubchem.service";
import { AlphafoldService } from "~/app/services/alphafold.service";

export interface ThreeDMolInputOptions {
  data: string;
  dataType: 'uniprot';
  viewerOptions: {
    mode: 'line' | 'stick' | 'cartoon';
    modeConfig?: any,
  };
  displayMode?: {
    useImageDisplay: boolean;  // Whether to use image display mode
  };
}

interface FetchMoleculeResult {
  model: string;
  dtype: 'sdf' | 'pdb' | 'mol';
}

interface FetchMoleculeResultWithViewerOptions extends FetchMoleculeResult {
  viewerOptions: ThreeDMolInputOptions['viewerOptions'];
}

@Component({
  selector: 'app-molecule3d',
  templateUrl: './molecule3d.component.html',
  providers: [ThreedmolLoaderService],
  standalone: true,
  host: {
    class: 'inline-block'
  }
})
export class Molecule3dComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() options: ThreeDMolInputOptions;
  @Input() isActive: boolean = false;
  @Output() componentClick = new EventEmitter<void>();

  @ViewChild("molContainer", { read: ElementRef })
  container: ElementRef<HTMLDivElement>;

  @ViewChild("imageContainer", { read: ElementRef })
  imageContainer: ElementRef<HTMLDivElement>;

  options$ = new BehaviorSubject<ThreeDMolInputOptions | null>(null);
  subscriptions: Subscription[] = [];

  moleculeToRender: FetchMoleculeResultWithViewerOptions | null = null;
  viewer$ = new BehaviorSubject<any | null>(null);
  
  // New properties for image display mode
  capturedImage: string | null = null;

  constructor(
    private $3dMolLoaderService: ThreedmolLoaderService,
    private pubchemService: PubchemService,
    private alphafoldService: AlphafoldService,
  ) { }

  ngAfterViewInit(): void {
    this.subscriptions.push(
      this.$3dMolLoaderService.get3DMol().pipe(
        first(),
        map($3dmol => $3dmol.createViewer(this.container.nativeElement))
      ).subscribe(viewer => {
        this.viewer$.next(viewer);
      })
    );

    this.subscriptions.push(
      this.viewer$.pipe(
        combineLatestWith(this.options$.pipe(
          filter((options) => options !== null),
          distinctUntilChanged()
        )),
        switchMap(([viewer, options]) => {
          return this.fetchMolecule$(options!).pipe(
            map(result => ({
              viewer,
              result: {
                ...result,
                viewerOptions: options!.viewerOptions
              }
            }))
          );
        })
      ).subscribe(({viewer, result}) => {
        this.moleculeToRender = result;
        this.renderMolecule(viewer, result);
        this.captureMoleculeImage(viewer);
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.options$.next(this.options);
    }
    
    // Handle isActive changes
    if (changes['isActive']) {
      if (!this.isActive && this.options?.displayMode?.useImageDisplay) {
        this.showImageMode();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // TODO: properly dispose of viewer to prevent warning Attachment has zero size
    this.viewer$.value?.removeAllModels();
    this.viewer$.value?.clear();
    this.viewer$.value?.stopAnimate();
    console.log('viewer disposed');
  }

  export(type: 'structure' | 'image') {
    switch (type) {
      case 'image':
        const viewer = this.$3dMolLoaderService.get3DMol().pipe(
            first(),
            map($3dmol => $3dmol.createViewer(this.container.nativeElement))
        );

        this.subscriptions.push(
          viewer.subscribe((viewer: any) => {
            viewer.exportImage('png');
          })
        );
        break;

      case 'structure':
        if (this.moleculeToRender) {
          const blob = new Blob([this.moleculeToRender.model], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const fileType = this.moleculeToRender.dtype;
          a.href = url;
          a.download = `${this.options.dataType}-${this.options.data}.${fileType}`;
          a.click();
          
          URL.revokeObjectURL(url);
          a.remove();
        }
        break;
    }
  }

  fetchMolecule$(options: ThreeDMolInputOptions): Observable<FetchMoleculeResult> {
    let fetcher$: Observable<FetchMoleculeResult>;

    if (options.dataType === 'uniprot') {
      fetcher$ = this.alphafoldService.get3DProtein(options.data).pipe(
        map(protein => ({
          model: protein,
          dtype: 'pdb'
        }))
      );
    // TODO: re-enable SMI input
    // } else if (options.dataType === 'smi') {
      // fetcher$ = this.service.getSubstrateInfoFromSMILES(options.data).pipe(
      //   map(substrate => {
      //     if (substrate?.MOL) {
      //       return {
      //         model: substrate.MOL,
      //         dtype: 'mol' as const
      //       };
      //     }
      //     throw new Error('No MOL structure found');
      //   }),
      //   catchError(() => {
      //     return this.pubchemService.get3DStructureFromSMILES(options.data).pipe(
      //       map(structure => ({
      //         model: structure,
      //         dtype: 'sdf' as const
      //       }))
      //     );
      //   })
      // );
    } else {
      fetcher$ = this.pubchemService.get3DStructureFromSMILES(options.data).pipe(
        map(structure => ({
          model: structure,
          dtype: 'sdf' as const
        }))
      );
    }

    return fetcher$;
  }

  private renderMolecule(
    viewer: any, 
    result: FetchMoleculeResultWithViewerOptions
  ) {
    viewer.clear();
    viewer.addModel(result.model, result.dtype);

    viewer.setStyle({}, { 
      [result.viewerOptions.mode]: {
        ...(result.viewerOptions.modeConfig ?? {})
      }
    });

    // Center and zoom the molecule
    viewer.zoomTo();
    viewer.render();
    viewer.zoom(1, 2000);
  }

  private captureMoleculeImage(viewer: any) {
    if (!viewer) return;
    
    // const width = this.options?.displayMode?.imageWidth || 300;
    // const height = this.options?.displayMode?.imageHeight || 300;
    
    // Capture the image
    const imageData = viewer.pngURI();
    this.capturedImage = imageData;
    
    // Update display based on mode
    this.updateDisplayMode();
  }

  private updateDisplayMode() {
    if (!this.options?.displayMode?.useImageDisplay) {
      this.showInteractiveMode();
      return;
    }

    if (this.capturedImage) {
      this.showImageMode();
    }
  }

  private showImageMode() {
    if (!this.imageContainer?.nativeElement) return;
    
    const container = this.imageContainer.nativeElement;
    container.innerHTML = `
      <div class="relative w-full h-full group">
        <img src="${this.capturedImage}" class="w-full h-full object-contain" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="opacity-0 group-hover:opacity-75 transition-opacity duration-200 ease-in-out cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    `;

    // Add click handler to switch to interactive mode
    container.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent event from bubbling up
      this.showInteractiveMode();
      this.componentClick.emit();
    });
  }

  private showInteractiveMode() {
    if (!this.container?.nativeElement) return;
    
    // Clear the image container
    if (this.imageContainer?.nativeElement) {
      this.imageContainer.nativeElement.innerHTML = '';
    }
    
    // Show the 3D viewer container
    this.container.nativeElement.style.display = 'block';
    
    // Re-render the molecule if needed
    if (this.moleculeToRender && this.viewer$.value) {
      this.renderMolecule(this.viewer$.value, this.moleculeToRender);
    }
  }
}