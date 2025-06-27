import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { DataSnapshotComponent } from "../../components/data-snapshot/data-snapshot.component";
import { TutorialComponent } from "../../components/tutorial/tutorial.component";
enum ActiveAboutPanel {
  ABOUT,
  TUTORIAL,
  STATISTICS,
  GITHUB,
  PUBLICATIONS,
  TEAM,
  GET_INVOLVED,
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [NgIf, DataSnapshotComponent, TutorialComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent {
  readonly ActiveAboutPanel = ActiveAboutPanel;

  activePanel$ = new BehaviorSubject(ActiveAboutPanel.ABOUT);

  constructor() { }
}
