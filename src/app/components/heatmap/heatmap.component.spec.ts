import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { HeatmapComponent } from './heatmap.component';

describe('HeatmapComponent', () => {
  let component: HeatmapComponent;
  let fixture: ComponentFixture<HeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatmapComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('HeatmapComponent cell tooltip', () => {
  let component: HeatmapComponent;
  let fixture: ComponentFixture<HeatmapComponent>;

  const cellAt = (row: number, col: number): HTMLElement =>
    fixture.nativeElement.querySelector(
      `td[data-row-index="${row}"][data-col-index="${col}"]`
    );

  const tooltip = (): HTMLElement | null =>
    document.querySelector('[role="tooltip"]');

  const hover = (row: number, col: number): HTMLElement => {
    const cell = cellAt(row, col);
    cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    fixture.detectChanges();
    return cell;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatmapComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(HeatmapComponent);
    component = fixture.componentInstance;
    component.data = {
      rowKeys: ['A', 'C'],
      colKeys: ['M', 'K', 'L', 'V', 'W', 'G', 'S', 'T'],
      values: [
        [-3, -1.5, 0.2, 1.4, 2.5, -0.4, 1.1, -2.2],
        [-2.5, -1.1, 0.1, 1.2, 2.2, -0.6, 0.9, -1.8],
      ],
    };
    component.ngOnChanges({
      data: {
        currentValue: component.data,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    } as any);
    fixture.detectChanges();
  });

  it('shows the hovered cell mutation and score', () => {
    hover(0, 0);

    expect(tooltip()).toBeTruthy();
    expect(component.tooltipContext!.displayLabel).toBe('M1A');
    expect(tooltip()!.textContent).toContain('M1A');
  });

  it('moves the tooltip onto each newly hovered cell', () => {
    // The defect this guards: the tooltip used to be positioned once, when it
    // first opened, and then stayed there while its text tracked the cursor.
    const firstCell = hover(0, 0);
    const firstBox = tooltip()!.getBoundingClientRect();
    const firstCellBox = firstCell.getBoundingClientRect();

    const laterCell = hover(0, 7);
    const laterBox = tooltip()!.getBoundingClientRect();
    const laterCellBox = laterCell.getBoundingClientRect();

    // Sanity: the two cells really are in different places.
    expect(laterCellBox.left).toBeGreaterThan(firstCellBox.left);

    expect(Math.abs(firstBox.left - firstCellBox.left))
      .withContext('tooltip aligned to the first cell')
      .toBeLessThanOrEqual(1);
    expect(Math.abs(laterBox.left - laterCellBox.left))
      .withContext('tooltip re-aligned to the second cell')
      .toBeLessThanOrEqual(1);
    expect(laterBox.left)
      .withContext('tooltip actually moved')
      .not.toBe(firstBox.left);
  });

  it('keeps the tooltip up while sweeping between adjacent cells', fakeAsync(() => {
    hover(0, 0);
    cellAt(0, 0).dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    hover(0, 1);

    tick(200);
    fixture.detectChanges();

    expect(tooltip())
      .withContext('a pending hide from the previous cell must not close it')
      .toBeTruthy();
    expect(component.tooltipContext!.displayLabel).toBe('K2A');
  }));

  it('hides the tooltip once the cursor leaves the grid', fakeAsync(() => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    cellAt(0, 0).dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    tick(200);
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
    expect(component.hoveredCell).toBeNull();
  }));

  it('dismisses the tooltip on scroll, since it is pinned to the viewport', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    document.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  });

  it('drops hover state when new data arrives', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    const nextData = { ...component.data, rowKeys: ['A', 'C'] };
    component.ngOnChanges({
      data: {
        currentValue: nextData,
        previousValue: component.data,
        firstChange: false,
        isFirstChange: () => false,
      },
    } as any);
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
    expect(component.hoveredCell).toBeNull();
  });
});
