import { RouterLink, RouterLinkActive } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { CleanDbService } from "~/app/services/clean-db.service";
import { ChartModule, UIChart } from "primeng/chart";
import { CommonModule } from "@angular/common";
import { TableModule } from "primeng/table";
import { PanelModule } from "primeng/panel";
import { BehaviorSubject } from "rxjs";
import { DropdownModule } from "primeng/dropdown";
import { FormsModule } from "@angular/forms";
import { SkeletonModule } from "primeng/skeleton";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DialogModule } from "primeng/dialog";
import { CheckboxModule } from "primeng/checkbox";
import { Component } from "@angular/core";
import { transition, style, animate, trigger } from "@angular/animations";


enum CLEAN_TOOLS {
  DB_SEARCH = '/database-search',
  EFFECT_PREDICTION = '/effect-prediction',
  NA = ''
}

const showTransition = transition(":enter", [
  style({ opacity: 0 }),
  animate(".2s ease-in", style({ opacity: 1 })),
]);
const fadeIn = trigger("fadeIn", [showTransition]);

@Component({
  selector: "landing-page",
  templateUrl: "./landing-page.component.html",
  styleUrls: ["./landing-page.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    RouterLink,
    RouterLinkActive,
    ChartModule,
    TableModule,
    PanelModule,
    DropdownModule,
    FormsModule,
    SkeletonModule,
    ProgressSpinnerModule,
    DialogModule,
    CheckboxModule,
  ],
  host: {
    class: 'flex flex-col justify-center items-center w-full'
  },
  animations: [fadeIn],
})
export class LandingPageComponent {
  researchNeeds = [
    {
      label: "enzyme sequence <-> enzyme function",
      value: CLEAN_TOOLS.DB_SEARCH,
    },
    {
      label: "enzyme sequence -> mutation effect",
      value: CLEAN_TOOLS.EFFECT_PREDICTION,
    },
  ];

  readonly CLEAN_TOOLS = CLEAN_TOOLS;
  selectedResearchNeed$ = new BehaviorSubject(CLEAN_TOOLS.NA);
  displayedResearchNeed$ = new BehaviorSubject(CLEAN_TOOLS.NA);

  constructor(
    protected service: CleanDbService,
  ) {}
}
