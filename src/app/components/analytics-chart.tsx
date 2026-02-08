import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ChartLoading } from "./chart-loading";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
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
  onLimitChange?: (limit: number) => void;
}

export function AnalyticsChart({ data, columns, isLoading, showInitialState, limit = 10, onLimitChange }: AnalyticsChartProps) {
  const chartRef = useRef<any>(null);
  const [showAllOptions, setShowAllOptions] = useState(false);

  // Flatten data and prepare for charting
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const flattened = flattenData(data);
    const numericFields = getNumericFields(flattened);
    const categoricalField = getCategoricalField(flattened, numericFields, columns);

    // Check if chartable
    if (flattened.length < 2 || numericFields.length === 0 || !categoricalField) {
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
    let chartType: "line" | "bar" | "horizontal-bar" | "grouped-bar" = "bar";
    
    if (isTimeSeries) {
      chartType = "line";
    } else {
      const rowCount = limitedData.length;
      const secondaryMetric = getSecondaryMetric(metricsFields, primaryMetric);
      
      // Check label length for all bar charts
      const hasLongLabels = limitedData.some(row => {
        const label = String(row[categoricalField] || "");
        return label.length > 25;
      });
      
      // Check if metrics have compatible types for grouped bars
      const hasCompatibleMetrics = secondaryMetric && columns ? (() => {
        const primaryCol = columns.find(c => c.name === primaryMetric);
        const secondaryCol = columns.find(c => c.name === secondaryMetric);
        if (!primaryCol || !secondaryCol) return true;
        // Don't group if one is PERCENTAGE and other is MONEY/NUMERIC (incompatible scales)
        const incompatibleTypes = [
          [primaryCol.type, secondaryCol.type],
          [secondaryCol.type, primaryCol.type]
        ].some(([t1, t2]) => 
          t1 === 'PERCENTAGE' && (t2 === 'MONEY' || t2 === 'NUMERIC')
        );
        return !incompatibleTypes;
      })() : true;
      
      // Check for grouped bars (dual metrics with compatible types)
      if (secondaryMetric && rowCount <= 12 && !hasLongLabels && hasCompatibleMetrics) {
        chartType = "grouped-bar";
      } else if (hasLongLabels && rowCount <= 40) {
        chartType = "horizontal-bar";
      } else if (rowCount >= 2 && rowCount <= 12) {
        chartType = "bar";
      } else if (rowCount >= 13 && rowCount <= 40) {
        chartType = "bar";
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

  const { data: processedData, fullDataLength, categoricalField, nameField, primaryMetric, secondaryMetric, chartType } = chartData;

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
    if (chartType === "line") {
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

    if (chartType === "horizontal-bar") {
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
              width={150}
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

    if (chartType === "grouped-bar" && secondaryMetric) {
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
              dataKey={secondaryMetric}
              name={formatFieldName(secondaryMetric)}
              fill="#5fcea8" 
            />
          </BarChart>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart</CardTitle>
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