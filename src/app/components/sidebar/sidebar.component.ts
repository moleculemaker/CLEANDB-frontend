import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { ToolStatus } from "~/app/enums/tool-status";
import { BehaviorSubject, map } from "rxjs";
import { Router } from "@angular/router";
import { NgIf, AsyncPipe, NgForOf, NgSwitch, NgSwitchCase, KeyValuePipe } from "@angular/common";
import { TooltipModule } from "primeng/tooltip";
import { SafePipe } from "~/app/pipes/safe.pipe";

export interface Tool {
  id: string;
  name: string;
  route: string;
  status: ToolStatus;
  svgGenerator: (fill: string) => string;
  group: string;
}

@Component({
    selector: "app-sidebar",
    templateUrl: "./sidebar.component.html",
    styleUrls: ["./sidebar.component.scss"],
    standalone: true,
    imports: [
        NgIf,
        NgForOf,
        NgSwitch,
        NgSwitchCase,
        TooltipModule,
        AsyncPipe,
        KeyValuePipe,
        SafePipe,
    ],
})
export class SidebarComponent implements OnInit {
  @Input() openInNewPage = true;
  @Input() tools: Tool[] = [];
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly ToolStatus = ToolStatus;

  selectedTool$ = new BehaviorSubject<string>('');

  groupedTools: { [key: string]: Tool[] } = {};

  fillColorsMap$ = this.selectedTool$.pipe(
    map((selectedToolId) => {
      const disabledColor = "#bdbdbd";
      const activeColor = "#224063";
      const normalColor = "#757575";

      return this.tools.reduce((acc, tool) => {
        const isDisabled = tool.status === ToolStatus.DISABLED;
        const isSelected = tool.id === selectedToolId;
        acc[tool.id] = isDisabled ? disabledColor : isSelected ? activeColor : normalColor;
        return acc;
      }, {} as Record<string, string>);
    })
  );

  constructor(private router: Router) {}

  ngOnInit(): void {
    const url = this.router.url;
    let possibleTool = url.split("/")[1];
    if (possibleTool.indexOf("?") !== -1) {
      possibleTool = possibleTool.split("?")[0];
    }
    this.selectedTool$.next(possibleTool);

    this.groupTools();
  }

  groupTools(): void {
    this.groupedTools = this.tools.reduce((acc, tool) => {
      if (!acc[tool.group]) {
        acc[tool.group] = [];
      }
      acc[tool.group].push(tool);
      return acc;
    }, {} as { [key: string]: Tool[] });
  }

  toggleCollapsed(): void {
    this.collapsedChange.emit(!this.collapsed);
  }
}
