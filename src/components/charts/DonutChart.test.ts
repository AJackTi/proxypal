import { describe, expect, it } from "vitest";
import { createDonutChartOption } from "./donutOptions";

const data = Array.from({ length: 10 }, (_, index) => ({
  name: `model-${index}`,
  value: 10 - index,
}));

describe("createDonutChartOption", () => {
  it("uses a readable dark-mode legend in a dedicated scrollable region", () => {
    const option = createDonutChartOption(data, true);
    const legend = option.legend as {
      left?: string;
      textStyle?: { color?: string };
      type?: string;
    };
    const series = (option.series as Array<{ center?: string[] }>)[0];

    expect(legend.textStyle?.color).toBe("#cbd5e1");
    expect(legend.left).toBe("54%");
    expect(legend.type).toBe("scroll");
    expect(series.center).toEqual(["25%", "50%"]);
  });
});
