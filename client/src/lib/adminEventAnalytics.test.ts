import { describe, expect, it } from "vitest";
import {
  applyFunnelFromTop,
  applySubmitRate,
  conversionCaption,
  fillDayRange,
  formatChartDay,
  formatEventLabel,
  hasAnalyticsSignal,
  pivotVolumeByDay,
  rankBarFill,
  seriesHasSignal,
  sparklineValues,
  visibleVolumeSeries,
} from "./adminEventAnalytics";

describe("formatEventLabel", () => {
  it("uses the known label for apply events", () => {
    expect(formatEventLabel("apply_started")).toBe("Apply started");
    expect(formatEventLabel("apply_form_submitted")).toBe("Apply submitted");
    expect(formatEventLabel("page_view")).toBe("Page views");
  });

  it("title-cases unknown snake_case events", () => {
    expect(formatEventLabel("new_widget_opened")).toBe("New Widget Opened");
  });
});

describe("conversionCaption", () => {
  it("mutes a true empty pair", () => {
    expect(conversionCaption(0, 0)).toEqual({ text: "None in this range", tone: "empty" });
  });

  it("does not claim 0% when the prior step has no events", () => {
    expect(conversionCaption(3, 0)).toEqual({ text: "Prior step empty", tone: "muted" });
  });

  it("reports 0% when the prior step has volume and this one does not", () => {
    expect(conversionCaption(0, 12)).toEqual({ text: "0% of prior", tone: "empty" });
  });

  it("rounds a real conversion", () => {
    expect(conversionCaption(3, 7)).toEqual({ text: "43% of prior", tone: "ok" });
  });
});

describe("pivotVolumeByDay", () => {
  const now = new Date(Date.UTC(2026, 8, 3));

  it("returns an empty series when there are no rows", () => {
    expect(pivotVolumeByDay([], 30, now)).toEqual([]);
  });

  it("fills the requested range and sums event kinds", () => {
    const points = pivotVolumeByDay(
      [
        { day: "2026-09-03", event: "apply_started", count: 2 },
        { day: "2026-09-03", event: "apply_form_submitted", count: 1 },
        { day: "2026-09-01", event: "page_view", count: 4 },
      ],
      7,
      now,
    );
    expect(points).toHaveLength(7);
    expect(points[0].day).toBe("2026-08-28");
    expect(points[0].total).toBe(0);
    const last = points[points.length - 1];
    expect(last.day).toBe("2026-09-03");
    expect(last.total).toBe(3);
    expect(last.apply_started).toBe(2);
    expect(last.apply_form_submitted).toBe(1);
    expect(last.label).toBe("Sep 3");
    const firstSep = points.find((p) => p.day === "2026-09-01");
    expect(firstSep?.page_view).toBe(4);
    expect(firstSep?.total).toBe(4);
  });

  it("keeps an API day that falls just outside the filled window", () => {
    const points = pivotVolumeByDay(
      [{ day: "2026-08-01T00:00:00.000Z", event: "share_clicked", count: 5 }],
      7,
      now,
    );
    expect(points[0].day).toBe("2026-08-01");
    expect(points[0].share_clicked).toBe(5);
    expect(points[0].total).toBe(5);
  });
});

describe("apply funnel from existing top events", () => {
  const top = [
    { event: "apply_started", count: 7 },
    { event: "apply_form_submitted", count: 3 },
    { event: "newsletter_signup", count: 3 },
    { event: "share_clicked", count: 3 },
    { event: "apply_step_2", count: 2 },
    { event: "apply_step_3", count: 2 },
    { event: "apply_step_4", count: 2 },
    { event: "apply_step_5", count: 2 },
  ];

  it("builds started to submitted from events already tracked", () => {
    const steps = applyFunnelFromTop(top);
    expect(steps.map((s) => s.event)).toEqual([
      "apply_started",
      "apply_step_2",
      "apply_step_3",
      "apply_step_4",
      "apply_step_5",
      "apply_form_submitted",
    ]);
    expect(steps[0].count).toBe(7);
    expect(steps[1]).toMatchObject({ event: "apply_step_2", count: 2, rate: "29%" });
    expect(steps[steps.length - 1]).toMatchObject({
      event: "apply_form_submitted",
      count: 3,
      rate: "43%",
    });
  });

  it("returns nothing when apply events are absent", () => {
    expect(applyFunnelFromTop([{ event: "newsletter_signup", count: 3 }])).toEqual([]);
  });

  it("summarizes started to submitted", () => {
    expect(applySubmitRate(top)).toEqual({
      started: 7,
      submitted: 3,
      text: "3 of 7 started reached submit (43%)",
    });
  });
});

describe("chart helpers", () => {
  it("formats a UTC day without shifting the calendar date", () => {
    expect(formatChartDay("2026-08-07")).toBe("Aug 7");
  });

  it("fills a UTC day range inclusive of today", () => {
    expect(fillDayRange(3, new Date(Date.UTC(2026, 8, 3)))).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("detects a live series and hides flat ones", () => {
    const points = pivotVolumeByDay(
      [{ day: "2026-09-03", event: "apply_started", count: 2 }],
      3,
      new Date(Date.UTC(2026, 8, 3)),
    );
    expect(seriesHasSignal(points, "apply_started")).toBe(true);
    expect(seriesHasSignal(points, "page_view")).toBe(false);
    expect(sparklineValues(points, "apply_started").reduce((a, b) => a + b, 0)).toBe(2);
    expect(visibleVolumeSeries(points).map((s) => s.key)).toEqual(["total", "apply_started"]);
  });

  it("uses darker forest for rank 1 than later ranks", () => {
    expect(rankBarFill(0)).toBe("#1a472a");
    expect(rankBarFill(6)).toBe("#6aad7a");
    expect(rankBarFill(99)).toBe("#6aad7a");
  });

  it("treats zeroed funnel + empty lists as no signal", () => {
    expect(
      hasAnalyticsSignal([], [], {
        pageViews: 0,
        ctaClicks: 0,
        applySubmitted: 0,
        loiSubmitted: 0,
      }),
    ).toBe(false);
    expect(
      hasAnalyticsSignal([{ event: "apply_started", count: 1 }], [], {
        pageViews: 0,
        ctaClicks: 0,
        applySubmitted: 0,
        loiSubmitted: 0,
      }),
    ).toBe(true);
  });
});
