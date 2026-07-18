import type { EChartsOption } from "echarts";

export interface DonutChartData {
  color?: string;
  name: string;
  value: number;
}

const COLORS = [
  "#3b82f6",
  "#38bdf8",
  "#a78bfa",
  "#fb923c",
  "#f472b6",
  "#22d3ee",
  "#facc15",
  "#94a3b8",
];

export function createDonutChartOption(data: DonutChartData[], isDark: boolean): EChartsOption {
  const legendColor = isDark ? "#cbd5e1" : "#475569";

  return {
    legend: {
      itemGap: 8,
      itemHeight: 10,
      itemWidth: 16,
      left: "54%",
      orient: "vertical",
      right: 8,
      textStyle: {
        color: legendColor,
        fontSize: 11,
        overflow: "truncate",
        width: 180,
      },
      top: "center",
      type: "scroll",
    },
    media: [
      {
        option: {
          legend: {
            bottom: 0,
            left: "center",
            orient: "horizontal",
            right: "auto",
            top: "auto",
            width: "92%",
          },
          series: [{ center: ["50%", "38%"], radius: ["34%", "54%"] }],
        },
        query: { maxWidth: 520 },
      },
    ],
    series: [
      {
        animationDuration: 800,
        animationEasing: "elasticOut",
        animationType: "scale",
        avoidLabelOverlap: true,
        center: ["25%", "50%"],
        data: data.map((item, index) => ({
          itemStyle: {
            color: item.color || COLORS[index % COLORS.length],
          },
          name: item.name,
          value: item.value,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.3)",
            shadowOffsetX: 0,
          },
          label: {
            fontSize: 14,
            fontWeight: "bold",
            show: true,
          },
        },
        itemStyle: {
          borderColor: "transparent",
          borderRadius: 6,
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        radius: ["46%", "70%"],
        type: "pie",
      },
    ],
    tooltip: {
      confine: true,
      formatter: "{b}: {c} ({d}%)",
      trigger: "item",
    },
  };
}
