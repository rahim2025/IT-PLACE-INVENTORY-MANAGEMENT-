import { useSelector } from "react-redux";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { selectThemeMode } from "../../features/theme/themeSlice";
import { CHART_GRID_LIGHT, CHART_GRID_DARK } from "../../lib/colors";
import { formatCurrency } from "../../lib/format";

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-[6px] border border-border bg-bg-elevated px-3 py-2 shadow-lg">
      <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">{label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-medium text-text">
        {currency ? formatCurrency(value) : value.toLocaleString()}
      </p>
    </div>
  );
}

export default function TrendChart({ data, color, type = "area", currency = false, height = 220 }) {
  const mode = useSelector(selectThemeMode);
  const grid = mode === "dark" ? CHART_GRID_DARK : CHART_GRID_LIGHT;
  const tickColor = mode === "dark" ? "#9aa2a4" : "#5b6266";

  const commonAxes = (
    <>
      <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={{ stroke: grid }}
        tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: tickColor }}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={currency ? 62 : 36}
        tick={{ fontFamily: "IBM Plex Mono", fontSize: 10.5, fill: tickColor }}
        tickFormatter={(v) => (currency ? `SAR ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}` : v)}
      />
      <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "transparent" }} />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {commonAxes}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${color.replace("#", "")})`}
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {commonAxes}
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
