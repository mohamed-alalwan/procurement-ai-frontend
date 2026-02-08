// Utility functions for processing data

import { FieldType, type ColumnMetadata } from '../services/chatService';

export interface FlattenedRow {
  [key: string]: any;
}

// Format field names for display (convert snake_case to Title Case)
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')           // Replace underscores with spaces
    .replace(/\./g, ' ')          // Replace dots with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space before capital letters in camelCase
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Flatten nested _id objects into group fields
export function flattenData(data: any[]): FlattenedRow[] {
  const result: FlattenedRow[] = [];
  
  data.forEach(row => {
    const flattened: FlattenedRow = { ...row };
    
    // Handle _id field
    if (row._id !== undefined) {
      if (typeof row._id === 'object' && row._id !== null) {
        // Nested object - flatten to group.field
        Object.entries(row._id).forEach(([key, value]) => {
          flattened[`group.${key}`] = value;
        });
      } else {
        // Primitive - add as group
        flattened.group = row._id;
      }
      // Remove _id after flattening
      delete flattened._id;
    }
    
    // Check for nested arrays of objects (common in API responses)
    const arrayFields = Object.keys(flattened).filter(key => 
      Array.isArray(flattened[key]) && 
      flattened[key].length > 0 && 
      typeof flattened[key][0] === 'object' &&
      flattened[key][0] !== null
    );
    
    if (arrayFields.length > 0) {
      // Use the first array field found as the data source
      const arrayField = arrayFields[0];
      const nestedArray = flattened[arrayField];
      
      // Get scalar fields and simple arrays from parent (to preserve context)
      const parentScalars: FlattenedRow = {};
      Object.keys(flattened).forEach(key => {
        const value = flattened[key];
        
        if (!Array.isArray(value)) {
          // Keep non-array fields
          if (typeof value !== 'object' || value === null) {
            parentScalars[key] = value;
          }
        } else if (key !== arrayField && value.length > 0) {
          // Keep simple arrays (not the one we're expanding)
          // Convert to comma-separated string if primitives, or show count if objects
          if (typeof value[0] === 'object' && value[0] !== null) {
            parentScalars[key] = `[${value.length} items]`;
          } else {
            parentScalars[key] = value.join(', ');
          }
        }
      });
      
      // Expand each item in the array into a separate row
      nestedArray.forEach((item: any) => {
        result.push({
          ...parentScalars,
          ...item
        });
      });
    } else {
      result.push(flattened);
    }
  });
  
  return result;
}

// Get all unique columns from flattened data (excluding arrays and objects)
export function getColumns(data: FlattenedRow[]): string[] {
  const columnSet = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      const value = row[key];
      // Only include primitive values (string, number, boolean, null, undefined)
      if (!Array.isArray(value) && (typeof value !== 'object' || value === null)) {
        columnSet.add(key);
      }
    });
  });
  
  const allColumns = Array.from(columnSet);
  
  // Filter out columns where all values are identical (constant metadata)
  if (data.length > 1) {
    return allColumns.filter(col => {
      const firstValue = data[0][col];
      // Keep column if any row has a different value
      return data.some(row => row[col] !== firstValue);
    });
  }
  
  return allColumns;
}

// Get column type from metadata
export function getColumnType(columnName: string, columns?: ColumnMetadata[]): FieldType {
  if (!columns || columns.length === 0) {
    return FieldType.TEXT;
  }
  const column = columns.find(col => col.name === columnName);
  return column?.type || FieldType.TEXT;
}

// Format quarter values with Q prefix
function formatQuarter(value: any): string {
  if (typeof value === 'number' && value >= 1 && value <= 4) {
    return `Q${value}`;
  }
  return String(value);
}

// Format month values with month names
function formatMonth(value: any): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (typeof value === 'number' && value >= 1 && value <= 12) {
    return monthNames[value - 1];
  }
  return String(value);
}

// Format date values
function formatDate(value: any): string {
  if (typeof value === 'string') {
    // Try to parse ISO datetime strings (2013-04-03T00:00:00)
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[month - 1];
      
      // Add ordinal suffix (1st, 2nd, 3rd, etc.)
      const getOrdinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      
      return `${getOrdinal(day)} ${monthName} ${year}`;
    }
  }
  return String(value);
}

// Format large numbers with K, M, B suffixes
function formatLargeNumber(value: number, isMoney: boolean = false): string {
  const absValue = Math.abs(value);
  const prefix = isMoney ? '$' : '';
  const sign = value < 0 ? '-' : '';
  
  if (isMoney) {
    // Money formatting with K/M/B suffixes
    if (absValue >= 1_000_000_000) {
      return `${sign}${prefix}${(absValue / 1_000_000_000).toFixed(2)}B`;
    } else if (absValue >= 1_000_000) {
      return `${sign}${prefix}${(absValue / 1_000_000).toFixed(2)}M`;
    } else if (absValue >= 10_000) {
      return `${sign}${prefix}${(absValue / 1_000).toFixed(1)}K`;
    } else {
      return `${sign}${prefix}${absValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  } else {
    // Regular number formatting without abbreviations
    return `${sign}${absValue.toLocaleString('en-US')}`;
  }
}

// Format numbers with locale separators
export function formatNumber(value: any, key: string, columns?: ColumnMetadata[]): string {
  if (value === null || value === undefined) {
    return "-";
  }
  
  // Skip arrays and objects
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  
  if (typeof value === 'object') {
    return "[object]";
  }
  
  if (typeof value === 'number' && isFinite(value)) {
    const fieldType = getColumnType(key, columns);
    
    // Format based on explicit type
    switch (fieldType) {
      case FieldType.QUARTER:
        return formatQuarter(value);
      
      case FieldType.MONTH:
        return formatMonth(value);
      
      case FieldType.YEAR:
        return String(value);
      
      case FieldType.PERCENTAGE:
        return `${(value * 100).toFixed(2)}%`;
      
      case FieldType.MONEY:
        return formatLargeNumber(value, true);
      
      case FieldType.NUMERIC:
      default:
        return formatLargeNumber(value, false);
    }
  }
  
  // Handle DATE type for string values
  const fieldType = getColumnType(key, columns);
  if (fieldType === FieldType.DATE && typeof value === 'string') {
    return formatDate(value);
  }
  
  return String(value);
}

// Identify numeric fields
export function getNumericFields(data: FlattenedRow[]): string[] {
  if (data.length === 0) return [];
  
  const fields = getColumns(data);
  return fields.filter(field => {
    return data.every(row => {
      const value = row[field];
      return value === null || value === undefined || (typeof value === 'number' && isFinite(value));
    });
  });
}

// Get categorical field (for chart X-axis)
export function getCategoricalField(data: FlattenedRow[], numericFields: string[], columns?: ColumnMetadata[]): string | null {
  const fields = getColumns(data);
  
  // Prefer 'group' field
  if (fields.includes('group')) {
    const uniqueValues = new Set(data.map(row => row.group));
    if (uniqueValues.size >= 2 && uniqueValues.size <= 50) {
      return 'group';
    }
  }
  
  // Check for time-based numeric fields (Year, Quarter, Month, etc.)
  for (const field of numericFields) {
    const fieldType = getColumnType(field, columns);
    if (fieldType === FieldType.YEAR || fieldType === FieldType.QUARTER || fieldType === FieldType.MONTH) {
      const uniqueValues = new Set(data.map(row => row[field]));
      if (uniqueValues.size >= 2 && uniqueValues.size <= 50) {
        return field;
      }
    }
  }
  
  // Check for date fields (string-based)
  for (const field of fields) {
    if (!numericFields.includes(field)) {
      const fieldType = getColumnType(field, columns);
      if (fieldType === FieldType.DATE) {
        const uniqueValues = new Set(data.map(row => row[field]));
        if (uniqueValues.size >= 2 && uniqueValues.size <= 50) {
          return field;
        }
      }
    }
  }
  
  // Find first non-numeric field with appropriate cardinality
  for (const field of fields) {
    if (!numericFields.includes(field)) {
      const uniqueValues = new Set(data.map(row => row[field]));
      if (uniqueValues.size >= 2 && uniqueValues.size <= 50) {
        return field;
      }
    }
  }
  
  // If no non-numeric field found, check if any numeric field can work as categorical
  // (e.g., small set of IDs or codes)
  for (const field of numericFields) {
    const uniqueValues = new Set(data.map(row => row[field]));
    if (uniqueValues.size >= 2 && uniqueValues.size <= 20) {
      return field;
    }
  }
  
  return null;
}

// Find a related name field for a code/ID field
export function findRelatedNameField(data: FlattenedRow[], codeField: string): string | null {
  const fields = getColumns(data);
  
  // If the code field contains "code", "id", "key", or "num", look for a matching name field
  if (/(code|id|key|num)/i.test(codeField)) {
    // Extract the base name (e.g., "Supplier" from "Supplier Code")
    const baseName = codeField.replace(/(code|id|key|num)/gi, '').trim();
    
    // Look for fields with similar base name that contain "name", "title", or "description"
    for (const field of fields) {
      if (field !== codeField && /name|title|description/i.test(field)) {
        // Check if it shares the base name
        if (baseName && field.toLowerCase().includes(baseName.toLowerCase())) {
          return field;
        }
        // Or if it's just generically a name field for the same entity
        if (!baseName && data[0] && data[0][field]) {
          return field;
        }
      }
    }
  }
  
  return null;
}

// Detect if field represents time series
export function isTimeSeriesField(data: FlattenedRow[], field: string, columns?: ColumnMetadata[]): boolean {
  const fieldType = getColumnType(field, columns);
  return fieldType === FieldType.YEAR || fieldType === FieldType.QUARTER || fieldType === FieldType.MONTH || fieldType === FieldType.DATE;
}

// Sort data for charting
export function sortDataForChart(
  data: FlattenedRow[],
  categoricalField: string,
  primaryMetric: string,
  columns?: ColumnMetadata[]
): FlattenedRow[] {
  const sortedData = [...data];
  const isTimeSeries = isTimeSeriesField(data, categoricalField, columns);
  
  if (isTimeSeries) {
    // Sort by time ascending
    sortedData.sort((a, b) => {
      const aVal = a[categoricalField];
      const bVal = b[categoricalField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
  } else {
    // Sort by primary metric descending for bar charts
    sortedData.sort((a, b) => (b[primaryMetric] || 0) - (a[primaryMetric] || 0));
  }
  
  return sortedData;
}

// Get primary metric (Y-axis) based on priority
export function getPrimaryMetric(numericFields: string[]): string | null {
  if (numericFields.length === 0) return null;
  
  // Priority 1: Fields matching common metric names
  const priorityFields = numericFields.filter(field => 
    /spend|amount|total|count|avg|mean/i.test(field)
  );
  
  if (priorityFields.length > 0) {
    return priorityFields[0];
  }
  
  // Priority 2: First numeric field
  return numericFields[0];
}

// Calculate variance for a numeric field
function calculateVariance(data: FlattenedRow[], field: string): number {
  const values = data.map(row => row[field]).filter(v => typeof v === 'number' && isFinite(v));
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

// Get secondary metric (for grouped bars)
export function getSecondaryMetric(numericFields: string[], primary: string): string | null {
  const others = numericFields.filter(f => f !== primary);
  return others.length > 0 ? others[0] : null;
}
