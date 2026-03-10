import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChartLoading } from "./chart-loading";
import { ChevronDown, ChevronUp, BarChart3, BarChart2, TrendingUp, Layers, PieChart as PieChartIcon, CircleDot } from "lucide-react";
import { useIsMobile } from "./ui/use-mobile";
import {
  flattenData,
  getNumericFields,
  getCategoricalField,
  isTimeSeriesField,
  getPrimaryMetric,
  getSecondaryMetric,
  findRelatedNameField,
  formatFieldName,
  formatNumber,
  sortDataForChart,
  type FlattenedRow
} from "../utils/dataProcessing";
import { FieldType, type ColumnMetadata } from "../services/chatService";

interface AnalyticsChartProps {
  data: any[];
  columns?: ColumnMetadata[];
  isLoading?: boolean;
  showInitialState?: boolean;
  limit?: number;
  userQuery?: string;
  onLimitChange?: (limit: number) => void;
}

// Detect chart type intent from the user's natural-language query
function detectQueryChartHint(query: string): "line" | "bar" | "horizontal-bar" | "grouped-bar" | "pie" | "donut" | null {
  if (!query) return null;
  const q = query.toLowerCase();
  if (/donut|doughnut/.test(q)) return "donut";
  if (/\bpie\b|slice|proportion|share of|composition|breakdown/.test(q)) return "pie";
  if (/\bline\b|trend|over time|timeline|growth|progression|month.by.month|year.by.year|quarterly trend|annual trend/.test(q)) return "line";
  if (/horizontal bar|ranked|ranking/.test(q)) return "horizontal-bar";
  if (/grouped bar|side.by.side|compare.*vs|\bvs\b|versus/.test(q)) return "grouped-bar";
  if (/\bbar\b|\bbar chart\b|column chart|histogram/.test(q)) return "bar";
  return null;
}

export function AnalyticsChart({ data, columns, isLoading, showInitialState, limit = 10, userQuery = "", onLimitChange }: AnalyticsChartProps) {
  const chartRef = useRef<any>(null);
  const [showAllOptions, setShowAllOptions] = useState(false);
  // Per-dataset chart type overrides: keyed by a signature of the data
  const [chartTypeOverrides, setChartTypeOverrides] = useState<Record<string, "line" | "bar" | "horizontal-bar" | "grouped-bar" | "pie" | "donut">>({});
  const isMobile = useIsMobile();

  // Stable key for the current dataset (row count + column names + first row snapshot)
  const dataKey = useMemo(() => {
    if (!data || data.length === 0) return "__empty__";
    const cols = Object.keys(data[0] || {}).join(",");
    const firstRow = JSON.stringify(data[0]);
    return `${data.length}|${cols}|${firstRow}`;
  }, [data]);

  // Flatten data and prepare for charting
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const flattened = flattenData(data);
    const numericFields = getNumericFields(flattened);
    const categoricalField = getCategoricalField(flattened, numericFields, columns);

    // Check if chartable
    if (flattened.length === 0 || numericFields.length === 0 || !categoricalField) {
      return { chartable: false, reason: "Not chartable for this output" };
    }

    // Check for large datasets
    if (flattened.length > 200) {
      return { chartable: false, reason: "Dataset too large (>200 rows). Showing table only." };
    }

    // Get primary metric excluding the categorical field
    const metricsFields = numericFields.filter(f => f !== categoricalField);
    const primaryMetric = getPrimaryMetric(metricsFields);
    if (!primaryMetric) {
      return { chartable: false, reason: "No suitable metric found" };
    }

    const isTimeSeries = isTimeSeriesField(flattened, categoricalField, columns);
    
    // Sort data
    const sortedData = sortDataForChart(flattened, categoricalField, primaryMetric, columns);

    // Store full sorted data before limiting
    const fullData = sortedData;
    
    // Apply limit for non-time series charts
    const limitedData = !isTimeSeries && sortedData.length > limit 
      ? sortedData.slice(0, limit) 
      : sortedData;

    // Determine chart type
    let chartType: "line" | "bar" | "horizontal-bar" | "grouped-bar" | "pie" | "donut" = "bar";

    // Shared secondary-metric check (used by both time-series and non-time-series paths)
    const secondaryMetric = getSecondaryMetric(metricsFields, primaryMetric);
    const hasCompatibleMetrics = secondaryMetric && columns ? (() => {
      const primaryCol = columns.find(c => c.name === primaryMetric);
      const secondaryCol = columns.find(c => c.name === secondaryMetric);
      if (!primaryCol || !secondaryCol) return true;
      const incompatibleTypes = [
        [primaryCol.type, secondaryCol.type],
        [secondaryCol.type, primaryCol.type]
      ].some(([t1, t2]) =>
        t1 === 'PERCENTAGE' && (t2 === 'MONEY' || t2 === 'NUMERIC')
      );
      return !incompatibleTypes;
    })() : true;
    const rowCount = limitedData.length;

    // Data-driven logic only (query hint applied later outside useMemo)
    if (isTimeSeries) {
      if (secondaryMetric && hasCompatibleMetrics && rowCount <= 12) {
        chartType = "grouped-bar";
      } else if (rowCount <= 8) {
        chartType = "bar";
      } else {
        chartType = "line";
      }
    } else {
      const hasLongLabels = limitedData.some(row => {
        const label = String(row[categoricalField] || "");
        return label.length > 25;
      });
      const hasSingleMetric = !secondaryMetric || !hasCompatibleMetrics;
      const proportionKeywords = /share|pct|percent|ratio|portion|mix|split|distribution|breakdown|composition|type|categor|sector|segment|group/i;
      const looksProportional = proportionKeywords.test(primaryMetric) || proportionKeywords.test(categoricalField);

      if (secondaryMetric && rowCount <= 12 && !hasLongLabels && hasCompatibleMetrics) {
        chartType = "grouped-bar";
      } else if (hasSingleMetric && rowCount >= 2 && rowCount <= 7 && !hasLongLabels) {
        chartType = "donut";
      } else if (hasSingleMetric && rowCount >= 2 && rowCount <= 12 && looksProportional && !hasLongLabels) {
        chartType = "donut";
      } else if (hasLongLabels && rowCount <= 40) {
        chartType = "horizontal-bar";
      } else {
        chartType = "bar";
      }
    }

    // Find related name field for better tooltips
    const nameField = findRelatedNameField(flattened, categoricalField);
    
    return {
      chartable: true,
      data: limitedData,
      fullDataLength: fullData.length,
      categoricalField,
      nameField,
      primaryMetric,
      secondaryMetric: chartType === "grouped-bar" ? getSecondaryMetric(metricsFields, primaryMetric) : null,
      availableSecondaryMetric: getSecondaryMetric(metricsFields, primaryMetric),
      hasCompatibleSecondary: hasCompatibleMetrics && !!secondaryMetric,
      chartType,
      isTimeSeries
    };
  }, [data, limit]);

  // Cleanup chart instance on unmount or before new render
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current = null;
      }
    };
  }, [chartData]);

  if (isLoading) {
    return <ChartLoading />;
  }

  if (showInitialState) {
    return <ChartLoading animate={false} />;
  }

  if (!chartData || !chartData.chartable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {chartData?.reason || "No chart data available"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Try a different query to visualize data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data: processedData, fullDataLength, categoricalField, nameField, primaryMetric, secondaryMetric, availableSecondaryMetric, hasCompatibleSecondary, chartType } = chartData;

  // Priority: 1) manual dropdown override  2) query hint  3) data-driven auto
  const queryHint = detectQueryChartHint(userQuery);
  const effectiveQueryHint: "line" | "bar" | "horizontal-bar" | "grouped-bar" | "pie" | "donut" | null =
    queryHint === "grouped-bar"
      ? (hasCompatibleSecondary ? "grouped-bar" : null)  // grouped-bar needs real secondary
      : queryHint;
  const activeChartType = chartTypeOverrides[dataKey] ?? effectiveQueryHint ?? chartType;
  // Use secondaryMetric whenever activeChartType is grouped-bar
  const activeSecondaryMetric = activeChartType === "grouped-bar" ? (availableSecondaryMetric ?? secondaryMetric) : null;

  const PIE_COLORS = ["#8b7dff", "#5fcea8", "#ff7d7d", "#ffd97d", "#7dc4ff", "#ff9d5f", "#c47dff", "#5fb8ff", "#a3e635", "#f472b6"];

  if (!primaryMetric || !categoricalField) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              No chart data available
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Try a different query to visualize data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCategoricalValue = (value: any) => {
    if (!categoricalField || !columns) return value;
    return formatNumber(value, categoricalField, columns);
  };

  const getAxisFormatter = (metric: string) => {
    return (value: number) => {
      if (!columns) return String(value);
      return formatNumber(value, metric, columns);
    };
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    // Get the actual data point from payload (contains full row data)
    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;
    
    // Find all non-numeric, non-metric fields to show as context
    const contextFields = Object.keys(dataPoint).filter(key => {
      const value = dataPoint[key];
      return typeof value === 'string' && key !== categoricalField;
    }).slice(0, 5); // Limit to first 5 context fields
    
    return (
      <div className="bg-popover border border-border rounded-md p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">
          {formatCategoricalValue(label)}
        </p>
        {contextFields.length > 0 && (
          <div className="mb-2 pb-2 border-b border-border">
            {contextFields.map((field, idx) => (
              <p key={idx} className="text-xs text-muted-foreground">
                {formatFieldName(field)}: {formatNumber(dataPoint[field], field, columns)}
              </p>
            ))}
          </div>
        )}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {formatFieldName(entry.dataKey)}: {formatNumber(entry.value, entry.dataKey, columns)}
          </p>
        ))}
      </div>
    );
  };

  // Render based on chart type
  const renderChart = () => {
    if (activeChartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData} ref={chartRef}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={categoricalField}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={formatCategoricalValue}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={getAxisFormatter(primaryMetric)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={primaryMetric}
              name={formatFieldName(primaryMetric)}
              stroke="#8b7dff"
              strokeWidth={2}
              dot={{ fill: '#8b7dff', r: 4, stroke: '#8b7dff', strokeWidth: 2 }}
              activeDot={{ fill: '#8b7dff', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (activeChartType === "horizontal-bar") {
      return (
        <ResponsiveContainer width="100%" height={Math.max(300, processedData.length * 35)}>
          <BarChart data={processedData} layout="vertical" ref={chartRef}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number"
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={getAxisFormatter(primaryMetric)}
            />
            <YAxis 
              type="category"
              dataKey={categoricalField}
              className="text-xs"
              width={isMobile ? 150 : 200}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey={primaryMetric}
              name={formatFieldName(primaryMetric)}
              fill="#8b7dff" 
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (activeChartType === "grouped-bar" && activeSecondaryMetric) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData} ref={chartRef}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey={categoricalField}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={formatCategoricalValue}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'currentColor' }}
              tickFormatter={getAxisFormatter(primaryMetric)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey={primaryMetric}
              name={formatFieldName(primaryMetric)}
              fill="#8b7dff" 
            />
            <Bar 
              dataKey={activeSecondaryMetric}
              name={formatFieldName(activeSecondaryMetric)}
              fill="#5fcea8" 
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (activeChartType === "pie" || activeChartType === "donut") {
      const innerRadius = activeChartType === "donut" ? "55%" : 0;
      return (
        <ResponsiveContainer width="100%" height={340}>
          <PieChart ref={chartRef}>
            <Pie
              data={processedData}
              dataKey={primaryMetric}
              nameKey={categoricalField}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="70%"
              paddingAngle={0}
              label={({ name, percent }) =>
                `${formatCategoricalValue(name)} ${(percent * 100).toFixed(1)}%`
              }
              labelLine={true}
            >
              {processedData.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [
                formatNumber(value, primaryMetric, columns),
                formatFieldName(String(name))
              ]}
            />
            <Legend formatter={(value) => formatFieldName(String(value))} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    // Default: vertical bar
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={processedData} ref={chartRef}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey={categoricalField}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatCategoricalValue}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            tickFormatter={getAxisFormatter(primaryMetric)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey={primaryMetric}
            name={formatFieldName(primaryMetric)}
            fill="#8b7dff" 
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const showLimitControls = !chartData?.isTimeSeries && fullDataLength && fullDataLength > 10 && onLimitChange;
  const hasMore = fullDataLength && limit < fullDataLength;
  
  const limitOptions = [10, 20, 30, 50, 100];

  const chartTypeOptions: { value: "bar" | "horizontal-bar" | "line" | "grouped-bar" | "pie" | "donut"; label: string; icon: React.ReactNode }[] = [
    { value: "bar",             label: "Bar",            icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { value: "horizontal-bar", label: "Horizontal Bar",  icon: <BarChart2 className="h-3.5 w-3.5 rotate-90" /> },
    { value: "line",            label: "Line",           icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { value: "pie",             label: "Pie",            icon: <PieChartIcon className="h-3.5 w-3.5" /> },
    { value: "donut",           label: "Donut",          icon: <CircleDot className="h-3.5 w-3.5" /> },
    ...(availableSecondaryMetric ? [{ value: "grouped-bar" as const, label: "Grouped Bar", icon: <Layers className="h-3.5 w-3.5" /> }] : []),
  ];

  const selectedOption = chartTypeOptions.find(o => o.value === activeChartType);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Chart</CardTitle>
        <Select
          value={activeChartType}
          onValueChange={(val) => setChartTypeOverrides(prev => ({ ...prev, [dataKey]: val as "line" | "bar" | "horizontal-bar" | "grouped-bar" | "pie" | "donut" }))}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs gap-1.5">
            <span className="flex items-center gap-1.5">
              {selectedOption?.icon}
              <span>{selectedOption?.label ?? "Chart type"}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {chartTypeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  {opt.icon}
                  {opt.label}
                  {opt.value === activeChartType && !chartTypeOverrides[dataKey] && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {effectiveQueryHint ? "(query)" : "(auto)"}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {showLimitControls && (
          <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing top {Math.min(limit, fullDataLength)} of {fullDataLength} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllOptions(!showAllOptions)}
                className="gap-1"
              >
                {showAllOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Limit: {limit}
              </Button>
              {showAllOptions && (
                <div className="flex gap-1">
                  {limitOptions.map(option => (
                    <Button
                      key={option}
                      variant={limit === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onLimitChange(option);
                        setShowAllOptions(false);
                      }}
                      disabled={option > fullDataLength}
                    >
                      {option}
                    </Button>
                  ))}
                  {fullDataLength > 100 && (
                    <Button
                      variant={limit === fullDataLength ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onLimitChange(fullDataLength);
                        setShowAllOptions(false);
                      }}
                    >
                      All
                    </Button>
                  )}
                </div>
              )}
              {hasMore && !showAllOptions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLimitChange(Math.min(limit + 20, fullDataLength))}
                >
                  Show More
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}