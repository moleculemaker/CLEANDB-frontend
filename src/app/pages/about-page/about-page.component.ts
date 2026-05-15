import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from "rxjs";
import { DataSnapshotComponent } from "../../components/data-snapshot/data-snapshot.component";
import { TutorialComponent } from "../../components/tutorial/tutorial.component";

enum ActiveAboutPanel {
  ABOUT,
  TUTORIAL,
  STATISTICS,
  LICENSE,
  API,
  GITHUB,
  PUBLICATIONS,
  TEAM,
  GET_INVOLVED,
}

const SECTION_TO_PANEL: Record<string, ActiveAboutPanel> = {
  '': ActiveAboutPanel.ABOUT,
  'tutorial': ActiveAboutPanel.TUTORIAL,
  'statistics': ActiveAboutPanel.STATISTICS,
  'license': ActiveAboutPanel.LICENSE,
  'api': ActiveAboutPanel.API,
  'github': ActiveAboutPanel.GITHUB,
  'publications': ActiveAboutPanel.PUBLICATIONS,
  'team': ActiveAboutPanel.TEAM,
  'get-involved': ActiveAboutPanel.GET_INVOLVED,
};

const PANEL_TO_SECTION: Record<ActiveAboutPanel, string> = {
  [ActiveAboutPanel.ABOUT]: '',
  [ActiveAboutPanel.TUTORIAL]: 'tutorial',
  [ActiveAboutPanel.STATISTICS]: 'statistics',
  [ActiveAboutPanel.LICENSE]: 'license',
  [ActiveAboutPanel.API]: 'api',
  [ActiveAboutPanel.GITHUB]: 'github',
  [ActiveAboutPanel.PUBLICATIONS]: 'publications',
  [ActiveAboutPanel.TEAM]: 'team',
  [ActiveAboutPanel.GET_INVOLVED]: 'get-involved',
};

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [NgIf, DataSnapshotComponent, TutorialComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent implements OnInit {
  readonly ActiveAboutPanel = ActiveAboutPanel;

  activePanel$ = new BehaviorSubject(ActiveAboutPanel.ABOUT);

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const section = params.get('section') ?? '';
      const panel = SECTION_TO_PANEL[section] ?? ActiveAboutPanel.ABOUT;
      this.activePanel$.next(panel);
    });
  }

  selectPanel(panel: ActiveAboutPanel): void {
    const section = PANEL_TO_SECTION[panel];
    const commands = section ? ['/about', section] : ['/about'];
    this.router.navigate(commands);
  }
}
