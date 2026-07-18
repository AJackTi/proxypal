import { createMemo } from "solid-js";
import { themeStore } from "../../stores/theme";
import { createDonutChartOption, type DonutChartData } from "./donutOptions";
import { EChartsWrapper } from "./EChartsWrapper";

export type { DonutChartData } from "./donutOptions";

interface DonutChartProps {
  centerSubtext?: string;
  centerText?: string;
  class?: string;
  data: DonutChartData[];
  onClick?: (name: string) => void;
  title?: string;
}

export function DonutChart(props: DonutChartProps) {
  const option = createMemo(() =>
    createDonutChartOption(props.data, themeStore.resolvedTheme() === "dark"),
  );

  const handleClick = (params: unknown) => {
    const p = params as { name?: string };
    if (props.onClick && p.name) {
      props.onClick(p.name);
    }
  };

  return <EChartsWrapper class={props.class} onChartClick={handleClick} option={option()} />;
}
