import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PanelModule } from 'primeng/panel';
import { ProteinViewerComponent } from '~/app/components/protein-viewer/protein-viewer.component';
import { ProteinSelectionService } from '~/app/services/protein-selection.service';
import {
  ProteinViewerStyle,
  ProteinColorScheme,
  ResidueSelection,
} from '~/app/models/protein-viewer';

interface DropdownOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-protein-viewer-demo',
  templateUrl: './protein-viewer-demo.component.html',
  styleUrls: ['./protein-viewer-demo.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    PanelModule,
    ProteinViewerComponent,
  ],
})
export class ProteinViewerDemoComponent {
  uniprotIdInput: string = 'P69905';
  activeUniprotId: string = 'P69905';

  style: ProteinViewerStyle = 'cartoon';
  colorScheme: ProteinColorScheme = 'spectrum';
  highlightColor: string = '#FF4444';

  highlightedResidues: ResidueSelection[] = [];

  styleOptions: DropdownOption<ProteinViewerStyle>[] = [
    { label: 'Cartoon', value: 'cartoon' },
    { label: 'Stick', value: 'stick' },
    { label: 'Line', value: 'line' },
    { label: 'Sphere', value: 'sphere' },
  ];

  colorSchemeOptions: DropdownOption<ProteinColorScheme>[] = [
    { label: 'Spectrum', value: 'spectrum' },
    { label: 'Chain', value: 'chain' },
    { label: 'Secondary Structure', value: 'ssJmol' },
    { label: 'Residue', value: 'residue' },
    { label: 'Default', value: 'default' },
  ];

  viewerId = 'demo-viewer';

  constructor(private proteinSelectionService: ProteinSelectionService) {}

  loadProtein(): void {
    this.activeUniprotId = this.uniprotIdInput.trim();
    this.highlightedResidues = [];
    this.proteinSelectionService.clearSelections(this.viewerId);
  }

  onResidueClicked(residue: ResidueSelection): void {
    // Selection state is managed by the service; we just update our local reference via the change event
  }

  onHighlightedResiduesChange(residues: ResidueSelection[]): void {
    this.highlightedResidues = residues;
  }

  addResidue50(): void {
    const residue: ResidueSelection = { resi: 50, resn: '', chain: 'A' };
    this.proteinSelectionService.toggleSelection(this.viewerId, residue);
  }

  clearHighlights(): void {
    this.proteinSelectionService.clearSelections(this.viewerId);
  }

  removeResidue(residue: ResidueSelection): void {
    this.proteinSelectionService.toggleSelection(this.viewerId, residue);
  }
}
