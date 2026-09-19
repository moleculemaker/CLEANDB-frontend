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
    // Asserted as overlap rather than a left-edge match so the assertion holds
    // whichever viewport edge the box ends up anchored to.
    const overlapsHorizontally = (a: DOMRect, b: DOMRect) =>
      a.left <= b.right && a.right >= b.left;

    const firstCell = hover(0, 0);
    const firstBox = tooltip()!.getBoundingClientRect();
    const firstCellBox = firstCell.getBoundingClientRect();

    const laterCell = hover(0, 7);
    const laterBox = tooltip()!.getBoundingClientRect();
    const laterCellBox = laterCell.getBoundingClientRect();

    // Sanity: the two cells really are in different places.
    expect(laterCellBox.left).toBeGreaterThan(firstCellBox.left);

    expect(overlapsHorizontally(firstBox, firstCellBox))
      .withContext('tooltip sits against the first cell')
      .toBeTrue();
    expect(overlapsHorizontally(laterBox, laterCellBox))
      .withContext('tooltip sits against the second cell')
      .toBeTrue();
    expect(laterBox.left)
      .withContext('tooltip actually moved')
      .not.toBe(firstBox.left);
  });

  describe('placement', () => {
    // Drives computeTooltipStyle off a stubbed cell rect so each branch is
    // exercised regardless of the size of the Karma window.
    const hoverWithRect = (rect: Partial<DOMRect>) => {
      const cell = cellAt(0, 0);
      const full = { width: 16, height: 16, ...rect } as DOMRect;
      const resolved = {
        ...full,
        right: full.right ?? full.left + full.width,
        bottom: full.bottom ?? full.top + full.height,
      } as DOMRect;
      spyOn(cell, 'getBoundingClientRect').and.returnValue(resolved);
      cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      fixture.detectChanges();
      return resolved;
    };

    const viewport = () => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    });

    it('anchors left and below for a cell in the top-left quadrant', () => {
      const { width, height } = viewport();
      const rect = hoverWithRect({ left: width * 0.1, top: height * 0.1 });

      expect(component.tooltipStyle.left).toBe(`${Math.round(rect.left)}px`);
      expect(component.tooltipStyle.top).toBe(`${Math.round(rect.bottom + 4)}px`);
      expect(component.tooltipStyle.right).toBeUndefined();
      expect(component.tooltipStyle.bottom).toBeUndefined();
    });

    it('anchors right for a cell past the horizontal midpoint', () => {
      const { width, height } = viewport();
      const rect = hoverWithRect({ left: width * 0.9, top: height * 0.1 });

      expect(component.tooltipStyle.right).toBe(`${Math.round(width - rect.right)}px`);
      expect(component.tooltipStyle.left).toBeUndefined();
    });

    it('anchors bottom for a cell past the vertical midpoint', () => {
      const { width, height } = viewport();
      const rect = hoverWithRect({ left: width * 0.1, top: height * 0.9 });

      expect(component.tooltipStyle.bottom).toBe(`${Math.round(height - rect.top + 4)}px`);
      expect(component.tooltipStyle.top).toBeUndefined();
    });

    it('measures against the layout viewport, not window.innerWidth', () => {
      // innerWidth includes a classic scrollbar; a fixed element is placed
      // against clientWidth, which does not. Mixing them put right-anchored
      // tooltips a scrollbar's width away from their cell on every platform
      // without overlay scrollbars. Force a classic scrollbar so the two
      // measurements actually differ here.
      const style = document.createElement('style');
      style.textContent =
        'html{overflow-y:scroll}html::-webkit-scrollbar{width:15px}';
      document.head.appendChild(style);

      try {
        const width = document.documentElement.clientWidth;
        expect(window.innerWidth)
          .withContext('test needs a classic scrollbar to be meaningful')
          .toBeGreaterThan(width);

        const rect = hoverWithRect({
          left: width * 0.9,
          top: document.documentElement.clientHeight * 0.1,
        });

        expect(component.tooltipStyle.right).toBe(`${Math.round(width - rect.right)}px`);
        expect(component.tooltipStyle.right)
          .withContext('must not be measured from innerWidth')
          .not.toBe(`${Math.round(window.innerWidth - rect.right)}px`);
      } finally {
        style.remove();
      }
    });
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

  it('dismisses the tooltip when a container around the grid scrolls', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    // Dispatched on an element inside the fixture, and scroll does not bubble,
    // so only a capture-phase listener sees it. A bubble-phase listener — which
    // would miss the heatmap's own overflow-x-scroll container in the real page
    // — fails here.
    const table: HTMLElement = fixture.nativeElement.querySelector('table');
    table.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  });

  it('ignores scrolls from containers that do not hold the grid', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    // The results table's virtual scroller is scrolled programmatically by the
    // page; it must not clear a tooltip the pointer is still resting on.
    const unrelated = document.createElement('div');
    document.body.appendChild(unrelated);
    try {
      unrelated.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      expect(tooltip()).withContext('unrelated scroll must not dismiss').toBeTruthy();
    } finally {
      unrelated.remove();
    }
  });

  it('dismisses the tooltip on resize, which reflows the grid', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();

    expect(tooltip()).toBeNull();
  });

  it('dismisses the tooltip on Escape', () => {
    hover(0, 0);
    expect(tooltip()).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
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
