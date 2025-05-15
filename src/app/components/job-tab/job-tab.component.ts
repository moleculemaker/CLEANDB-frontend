import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { MenuItem, PrimeTemplate } from 'primeng/api';
import { TabMenuModule } from 'primeng/tabmenu';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-job-tab',
    templateUrl: './job-tab.component.html',
    styleUrls: ['./job-tab.component.scss'],
    standalone: true,
    imports: [TabMenuModule, PrimeTemplate, NgIf]
})
export class JobTabComponent implements OnChanges {
  @Input() tab: string;
  @Output() onTabChange = new EventEmitter<"input" | "result">();

  jobId = this.router.url.split(/\/.*\/result\//).length > 1 
    ? this.router.url.split(/\/.*\/result\//)[this.router.url.split(/\/.*\/result\//).length - 1]
    : null;
  tabs: MenuItem[] = [
    { label: "Request Configuration" },
    { label: "Recommendation Results" },
  ];
  activeTab: MenuItem = this.tabs[0];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.router.url.search(/\/.*\/result\//) !== -1) {
      this.tabs[1].disabled = false;
      this.activeTab = this.tabs[1];
    } else {
      this.tabs[1].disabled = true;
    }
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.jobId = this.router.url.split(/\/.*\/result\//).length > 1 
          ? this.router.url.split(/\/.*\/result\//)[this.router.url.split(/\/.*\/result\//).length - 1]
          : null;
        if (this.router.url.search(/\/.*\/result\//) !== -1) {
          this.tabs[1].disabled = false;
          this.activeTab = this.tabs[1];
        } else {
          this.tabs[1].disabled = true;
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tab'] && changes['tab'].currentValue) {
      this.activeTab = changes['tab'].currentValue === 'input' 
        ? this.tabs[0] 
        : this.tabs[1]
    }
  }
}
