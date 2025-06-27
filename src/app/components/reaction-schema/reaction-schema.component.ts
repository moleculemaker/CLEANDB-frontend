import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { filter, Subscription } from 'rxjs';
import { ReactionSchemaRecord, ReactionSchemaRecordChemicalRaw } from '~/app/models/ReactionSchemaRecord';
import { MoleculeImageComponent } from '../molecule-image/molecule-image.component';
import { CactusService } from '~/app/services/cactus.service';

@Component({
  selector: 'app-reaction-schema',
  standalone: true,
  imports: [
    CommonModule,
    MoleculeImageComponent,
  ],
  templateUrl: './reaction-schema.component.html',
  styleUrl: './reaction-schema.component.scss'
})
export class ReactionSchemaComponent {
  @Input() reactionSchema: ReactionSchemaRecord;
}

