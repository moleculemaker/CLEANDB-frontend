import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-center-layout',
  templateUrl: './center-layout.component.html',
  styleUrls: ['./center-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
  host: {
    class: 'grow flex flex-col justify-center'
  }
})
export class CenterLayoutComponent {

}
