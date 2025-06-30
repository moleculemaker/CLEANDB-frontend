import { Component } from '@angular/core';
import { TutorialComponent } from "../../components/tutorial/tutorial.component";

@Component({
  selector: 'app-tutorial-page',
  standalone: true,
  imports: [TutorialComponent],
  templateUrl: './tutorial-page.component.html',
  styleUrls: ['./tutorial-page.component.scss']
})
export class TutorialPageComponent {

}
