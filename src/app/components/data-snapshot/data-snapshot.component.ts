import { ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
//import { OpenEnzymeDBService } from "../../services/openenzymedb.service";
import { ChartModule, UIChart } from "primeng/chart";
import { CommonModule } from "@angular/common";
import { TableModule } from "primeng/table";
import { PanelModule } from "primeng/panel";
import { combineLatest, combineLatestAll } from "rxjs";
import { DropdownModule } from "primeng/dropdown";
import { FormsModule } from "@angular/forms";
import { SkeletonModule } from "primeng/skeleton";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { DialogModule } from "primeng/dialog";
//import { TutorialService } from "../../services/tutorial.service";
import { CheckboxModule } from "primeng/checkbox";
import { ecClassStatistics, ECClassStatistics, totalStatistics } from "~/app/models/dataset-stats";

type ChartData = {
  status: 'loading' | 'loaded',
  data: any,
  options: any,
  plugins: any[],
};

type PieChartState = 'focused'
  | 'hovering'
  | 'mouseout'
  | 'default'
  | 'hovering-ec'
  | 'mouseout-ec';

type BarChartState = 'focused'
  | 'hovering'
  | 'mouseout'
  | 'default'
  | 'hovering-ec'
  | 'mouseout-ec';

@Component({
  selector: "app-data-snapshot",
  templateUrl: "./data-snapshot.component.html",
  styleUrls: ["./data-snapshot.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
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
})
export class DataSnapshotComponent {
  @ViewChildren(UIChart) charts!: QueryList<UIChart>;
  @ViewChild('dataSnapshot') dataSnapshot!: ElementRef<HTMLDivElement>;

  readonly whitePaperUrl = 'FIXME'; // this.service.WHITE_PAPER_URL;
  readonly visionUrl = 'FIXME'; // this.service.VISION_URL;
  readonly feedbackUrl = 'cleandb-feedback@moleculemaker.org'; // this.service.FEEDBACK_URL;
  readonly ecClassStatistics = ecClassStatistics;
  readonly totalStatistics = totalStatistics;

  dropdownOptions = [
    { label: 'EC Class Summary', value: 'pieChart' },
    { label: 'Confidence Summary', value: 'barChart' },
  ];

  displayTutorial = true;

  #chartStates: Record<'pieChart' | 'barChart', {
    state: PieChartState | BarChartState,
    payload: any
  }> = {
      pieChart: {
        state: 'default',
        payload: null,
      },
      barChart: {
        state: 'default',
        payload: null,
      }
    }

  get chartState() {
    return this.#chartStates[this.currentChart];
  }

  set chartState(state: {
    state: PieChartState | BarChartState,
    payload: any
  }) {
    const currentState = this.#chartStates[this.currentChart].state;
    const stateStr = `${currentState}--->${state.state}`;

    if (this.currentChart === 'pieChart') {
      switch (stateStr) {
        case 'default--->hovering':
        case 'default--->focused':
        case 'default--->hovering-ec':
        case 'hovering--->focused':
        case 'hovering--->hovering':
        case 'hovering--->hovering-ec':
        case 'hovering-ec--->hovering-ec':
        case 'hovering-ec--->focused':
        case 'hovering-ec--->hovering':
        case 'mouseout--->focused':
        case 'mouseout--->hovering':
        case 'mouseout--->hovering-ec':
        case 'mouseout-ec--->focused':
        case 'mouseout-ec--->hovering':
        case 'mouseout-ec--->hovering-ec':
        case 'focused--->focused':
          console.log('highlighting pie: ', stateStr, state.payload);
          this.highlightAllPieCharts(state.payload);
          break;

        case 'hovering--->mouseout':
        case 'hovering-ec--->mouseout-ec':
        case 'focused--->default':
          console.log('resetting pie highlight: ', stateStr);
          this.resetPieChartHighlight();
          break;

        case 'focused--->mouseout':
        case 'focused--->hovering':
        case 'focused--->mouseout-ec':
        case 'focused--->hovering-ec':
          // prevent mouseout from resetting the highlight
          return;
      }
    } else {
      switch (stateStr) {
        case 'default--->hovering':
        case 'mouseout--->hovering':
        case 'hovering-ec--->hovering':
        case 'hovering--->hovering':
        case 'mouseout-ec--->hovering':
        // console.log('highlighting single bar chart', state.payload);
        // this.highlightSingleBarChart(state.payload);
        // break;

        case 'default--->hovering-ec':
        case 'mouseout--->hovering-ec':
        case 'hovering--->hovering-ec':
        case 'hovering-ec--->hovering-ec':
        case 'mouseout-ec--->hovering-ec':

        case 'hovering--->focused':
        case 'hovering-ec--->focused':
        case 'mouseout--->focused':
        case 'mouseout-ec--->focused':
        case 'focused--->focused':
          console.log('highlighting bar: ', stateStr, state.payload);
          this.highlightAllBarCharts(state.payload);
          break;

        case 'hovering--->mouseout':
        case 'hovering-ec--->mouseout-ec':
        case 'focused--->default':
          console.log('resetting bar highlight: ', stateStr);
          this.resetBarChartHighlight();
          break;

        case 'focused--->mouseout':
        case 'focused--->hovering':
        case 'focused--->mouseout-ec':
        case 'focused--->hovering-ec':
          // prevent mouseout from resetting the highlight
          return;
      }
    }

    this.#chartStates[this.currentChart] = state;
    this.cdr.detectChanges();
  }

  currentChart: 'pieChart' | 'barChart' = 'pieChart';

  chartConfigs: {
    pieChart: {
      data: {
        ec: ChartData
      },
      styleConfig: any,
    },
    barChart: {
      data: ChartData,
      styleConfig: any,
    }
  } = {
      pieChart: {
        data: {
          ec: {
            status: 'loading',
            data: [],
            options: {},
            plugins: [],
          },
        },
        styleConfig: {},
      },

      barChart: {
        data: {
          status: 'loading',
          data: [],
          options: {},
          plugins: [],
        },
        styleConfig: {},
      }
    }

  ecSummary = [
    { label: 'EC 1', longLabel: 'EC 1 - Oxidoreductases', description: 'Catalyze oxidation-reduction reactions.' },
    { label: 'EC 2', longLabel: 'EC 2 - Transferases', description: 'Transfer a functional group from one molecule to another.' },
    { label: 'EC 3', longLabel: 'EC 3 - Hydrolases', description: 'Catalyze hydrolysis reactions, breaking down molecules by adding water.' },
    { label: 'EC 4', longLabel: 'EC 4 - Lyases', description: 'Cleave chemical bonds by mechanisms other than hydrolysis, often forming double bonds.' },
    { label: 'EC 5', longLabel: 'EC 5 - Isomerases', description: 'Rearrange atoms within a molecule to create isomers.' },
    { label: 'EC 6', longLabel: 'EC 6 - Ligases', description: 'Join two molecules together, usually using ATP.' },
    { label: 'EC 7', longLabel: 'EC 7 - Translocases', description: 'Move ions, molecules across membranes.' },
  ]

  // datasetSummary: any[] = [];
  summary: {
    kcat: any,
    km: any,
    kcat_km: any,
    dataset: any,
    status: 'na' | 'loading' | 'loaded',
  } = {
    status: 'na',
    kcat: null,
    km: null,
    kcat_km: null,
    dataset: null,
  }

  constructor(
    //protected service: OpenEnzymeDBService,
    private cdr: ChangeDetectorRef,
    //protected tutorialService: TutorialService,
  ) {

    /*
    this.tutorialService.tutorialKey = 'landing-page-tutorial';
    if (!this.tutorialService.showTutorial) {
      this.displayTutorial = true;
    } else {
      this.displayTutorial = false;
    }

      this.summary = {
        ...this.generateSummary(kcatDf, kmDf, kcatKmDf),
        status: 'loaded',
      };
    */
   this.summary.status = 'loaded';

    const documentStyle = getComputedStyle(document.documentElement);
    const colorLayer = ['500', '300', '100', '50'];
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'teal', 'red'];
    const dimOpacity = 0.2;
    this.chartConfigs['pieChart']['styleConfig'] = {
      dimOpacity,
      textColor: documentStyle.getPropertyValue('--text-color'),
      backgroundColor: colors.map((color) => documentStyle.getPropertyValue(`--${color}-${colorLayer[0]}`)),
      hoverBackgroundColor: colors.map((color) => documentStyle.getPropertyValue(`--${color}-${colorLayer[0]}`))
    }
    this.chartConfigs.pieChart.data.ec = this.generatePieChart(ecClassStatistics, totalStatistics);

    const barChartColors = ['blue', 'cyan', 'teal'];
    this.chartConfigs['barChart']['styleConfig'] = {
      dimOpacity,
      textColor: documentStyle.getPropertyValue('--text-color'),
      backgroundColor: barChartColors.map((color) => documentStyle.getPropertyValue(`--${color}-${colorLayer[0]}`)),
      hoverBackgroundColor: barChartColors.map((color) => documentStyle.getPropertyValue(`--${color}-${colorLayer[0]}`))
    }
    this.chartConfigs.barChart.data.status = 'loaded';
    this.chartConfigs.barChart.data.data = {
      labels: this.ecSummary.map((ec) => ec.label),
      datasets: [
        {
          label: 'Low (0.2 - 0.5)',
          data: ecClassStatistics.map((ec) => ec.lowConfidencePredictions),
          total: ecClassStatistics.reduce((acc, ec) => acc + ec.lowConfidencePredictions, 0),
          backgroundColor: this.chartConfigs['barChart']['styleConfig']['backgroundColor'][0],
          hoverBackgroundColor: this.chartConfigs['barChart']['styleConfig']['hoverBackgroundColor'][0],
        },
        {
          label: 'Medium (0.5 - 0.8)',
          data: ecClassStatistics.map((ec) => ec.midConfidencePredictions),
          total: ecClassStatistics.reduce((acc, ec) => acc + ec.midConfidencePredictions, 0),
          backgroundColor: this.chartConfigs['barChart']['styleConfig']['backgroundColor'][1],
          hoverBackgroundColor: this.chartConfigs['barChart']['styleConfig']['hoverBackgroundColor'][1],
        },
        {
          label: 'High (0.8 - 1.0)',
          data: ecClassStatistics.map((ec) => ec.highConfidencePredictions),
          total: ecClassStatistics.reduce((acc, ec) => acc + ec.highConfidencePredictions, 0),
          backgroundColor: this.chartConfigs['barChart']['styleConfig']['backgroundColor'][2],
          hoverBackgroundColor: this.chartConfigs['barChart']['styleConfig']['hoverBackgroundColor'][2],
        },
      ],
    };

    document.addEventListener('click', (e) => {
      this.chartState = {
        state: 'default',
        payload: null,
      };
    });
  }

  generateSummary(kcat: any, km: any, kcatKm: any) {
    function getSummary(df: any) {
      const substratesSet = new Set(df.filter((row: any) => row['SUBSTRATE']).map((row: any) => row['SUBSTRATE']));
      const organismsSet = new Set(df.filter((row: any) => row['ORGANISM']).map((row: any) => row['ORGANISM']));
      const ecNumbersSet = new Set(df.filter((row: any) => row['EC']).map((row: any) => row['EC']));
      const uniprotIdsSet = new Set(df.filter((row: any) => row['UNIPROT']).map((row: any) => row['UNIPROT']));
      const pubmedIdsSet = new Set(df.filter((row: any) => row['PubMedID']).map((row: any) => row['PubMedID']));

      return {
        substrates: substratesSet.size,
        organisms: organismsSet.size,
        ecNumbers: ecNumbersSet.size,
        uniprotIds: uniprotIdsSet.size,
        pubmedIds: pubmedIdsSet.size,
        total: df.length,
      };
    }

    const kcatSummary = getSummary(kcat);
    const kmSummary = getSummary(km);
    const kcatKmSummary = getSummary(kcatKm);

    // transpose the summary
    const dataset = [
      { label: 'Unique Substrates', kcat: kcatSummary.substrates, km: kmSummary.substrates, kcat_km: kcatKmSummary.substrates },
      { label: 'Unique Organisms', kcat: kcatSummary.organisms, km: kmSummary.organisms, kcat_km: kcatKmSummary.organisms },
      { label: 'Unique Uniprot IDs', kcat: kcatSummary.uniprotIds, km: kmSummary.uniprotIds, kcat_km: kcatKmSummary.uniprotIds },
      { label: 'Unique EC Numbers', kcat: kcatSummary.ecNumbers, km: kmSummary.ecNumbers, kcat_km: kcatKmSummary.ecNumbers },
      { label: 'Unique Literature', kcat: kcatSummary.pubmedIds, km: kmSummary.pubmedIds, kcat_km: kcatKmSummary.pubmedIds },
      { label: 'Total Entries', kcat: kcatSummary.total, km: kmSummary.total, kcat_km: kcatKmSummary.total },
    ];

    return {
      kcat: kcatSummary,
      km: kmSummary,
      kcat_km: kcatKmSummary,
      dataset,
    };
  }

  generatePieChart(stats: ECClassStatistics[], totalStatistics: ECClassStatistics): ChartData {
    // we use totalStatistics to calculate the percentage of each EC class
    // we could instead sum the count of each EC class, but that would not account for the fact that some entries have multiple predicted EC classes

    return {
      status: 'loaded',
      data: {
        labels: stats.map((d) => d.ecClassTitle),
        datasets: [
          {
            data: stats.map((d) => d.entries),
            backgroundColor: this.chartConfigs['pieChart']['styleConfig']['backgroundColor'],
            hoverBackgroundColor: this.chartConfigs['pieChart']['styleConfig']['hoverBackgroundColor'],
          },
        ],
      },
      options: {
        // events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
        onHover: (e: any, chartElement: any) => {
          if (chartElement.length > 0) {
            this.chartState = {
              state: 'hovering',
              payload: chartElement[0].index,
            };
          }
        },
        onClick: (e: any, chartElement: any) => {
          if (chartElement.length > 0) {
            this.chartState = {
              state: 'focused',
              payload: chartElement[0].index,
            };
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (context: any) => {
              // Tooltip Element
              let tooltipEl = document.getElementById('chartjs-tooltip1');

              // Create element on first render
              if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'chartjs-tooltip1';
                document.body.appendChild(tooltipEl);
              }

              // Hide if no tooltip
              const tooltipModel = context.tooltip;
              if (tooltipModel.opacity === 0) {
                tooltipEl.style.opacity = '0';
                return;
              }

              // Set caret Position
              tooltipEl.classList.remove('above', 'below', 'no-transform');
              if (tooltipModel.yAlign) {
                tooltipEl.classList.add(tooltipModel.yAlign);
              } else {
                tooltipEl.classList.add('no-transform');
              }
              // Set Text
              if (tooltipModel.body) {
                const dataPoint = context.tooltip.dataPoints[0];

                console.log(dataPoint);
                // console.log(this.ecSummary[dataPoint.dataIndex]);

                tooltipEl.innerHTML = `
                  <div class="flex flex-col bg-black/90 text-sm p-2 text-white rounded-md shadow-sm gap-2">
                    <div class="flex w-full justify-between gap-4">
                      <div class="flex items-center gap-1">
                        <div class="
                          w-4 h-4 rounded-full 
                          border border-solid border-white" 
                          style="background-color: ${this.chartConfigs['pieChart']['styleConfig']['backgroundColor'][dataPoint.dataIndex]}">
                        </div>
                        <span>${this.ecSummary[dataPoint.dataIndex].label}</span>
                      </div>
                      <div class="flex font-semibold">
                        ${dataPoint.formattedValue} (${(dataPoint.raw / totalStatistics.entries * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                `;
              }


              const position = context.chart.canvas.getBoundingClientRect();

              // Display, position, and set styles for font
              tooltipEl.style.opacity = '1';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 'px';
              tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY + 'px';
              tooltipEl.style.font = '12px sans-serif';
              tooltipEl.style.padding = '10px 15px';
              tooltipEl.style.pointerEvents = 'none';
            }
          },
        }
      },
      plugins: [
        {
          id: 'event-catcher',
          beforeEvent: (chart: any, args: any) => {
            if (args.event.type === 'mouseout') {
              this.chartState = {
                state: 'mouseout',
                payload: null,
              };
            }
          }
        }
      ],
    };
  }

  highlightAllPieCharts(activeIndex: number) {
    // Reset all segments
    const pieChartStyleConfig = this.chartConfigs['pieChart']['styleConfig'];
    this.charts.filter((chart) => chart.type === 'pie').forEach((chart) => {
      const hexDimOpacity = Math.round(pieChartStyleConfig['dimOpacity'] * 255).toString(16);
      chart.data.datasets[0].backgroundColor = [...pieChartStyleConfig['backgroundColor'].map((color: string) => color + hexDimOpacity)];
      chart.data.datasets[0].backgroundColor[activeIndex] = pieChartStyleConfig['hoverBackgroundColor'][activeIndex];
      chart.chart.update();
    });
  }

  highlightAllBarCharts(activeIndex: number) {
    // Reset all segments
    const barChartStyleConfig = this.chartConfigs['barChart']['styleConfig'];
    this.charts.filter((chart) => chart.type === 'bar').forEach((chart) => {
      // console.log(chart, bar);
      const hexDimOpacity = Math.round(barChartStyleConfig['dimOpacity'] * 255).toString(16);
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        dataset.backgroundColor = Array(dataset.data.length).fill(barChartStyleConfig['backgroundColor'][datasetIndex] + hexDimOpacity);
        dataset.backgroundColor[activeIndex] = barChartStyleConfig['backgroundColor'][datasetIndex];
      });
      chart.chart.update();
    });
  }

  highlightSingleBarChart({ activeIndex, datasetIndex }: { activeIndex: number, datasetIndex: number }) {
    // Reset all segments
    console.log('highlighting single bar chart', activeIndex, datasetIndex);
    const barChartStyleConfig = this.chartConfigs['barChart']['styleConfig'];
    this.charts.filter((chart) => chart.type === 'bar').forEach((chart) => {
      // console.log(chart, bar);
      const hexDimOpacity = Math.round(barChartStyleConfig['dimOpacity'] * 255).toString(16);
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        dataset.backgroundColor = Array(dataset.data.length).fill(barChartStyleConfig['backgroundColor'][datasetIndex] + hexDimOpacity);
      });
      chart.data.datasets[datasetIndex].backgroundColor[activeIndex] = barChartStyleConfig['backgroundColor'][datasetIndex];
      chart.chart.update();
    });
  }

  resetPieChartHighlight() {
    this.charts.filter((chart) => chart.type === 'pie').forEach((chart) => {
      chart.data.datasets[0].backgroundColor = [...this.chartConfigs['pieChart']['styleConfig']['backgroundColor']];
      chart.chart.update();
    });
  }

  resetBarChartHighlight() {
    const barChartStyleConfig = this.chartConfigs['barChart']['styleConfig'];
    this.charts.filter((chart) => chart.type === 'bar').forEach((chart) => {
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        dataset.backgroundColor = Array(dataset.data.length).fill(barChartStyleConfig['backgroundColor'][datasetIndex]);
      });
      chart.chart.update();
    });
  }

  scrollToDataSnapshot() {
    this.dataSnapshot.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
