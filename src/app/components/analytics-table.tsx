import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TableLoading } from "./table-loading";
import { ArrowUpDown, ArrowUp, ArrowDown, Database } from "lucide-react";
import { flattenData, getColumns, formatNumber, type FlattenedRow } from "../utils/dataProcessing";
import { type ColumnMetadata } from "../services/chatService";

interface AnalyticsTableProps {
  data: any[];
  columns?: ColumnMetadata[];
  isLoading?: boolean;
  showInitialState?: boolean;
  currentPage?: number;
  rowsPerPage?: number;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
  onSortChange?: (column: string | null, direction: "asc" | "desc" | null) => void;
}

type SortDirection = "asc" | "desc" | null;

export function AnalyticsTable({ 
  data,
  columns,
  isLoading,
  showInitialState,
  currentPage: externalPage,
  rowsPerPage: externalRowsPerPage,
  sortColumn: externalSortColumn,
  sortDirection: externalSortDirection,
  onPageChange,
  onRowsPerPageChange,
  onSortChange
}: AnalyticsTableProps) {
  // Use external state if provided, otherwise use internal state
  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  const [internalSortColumn, setInternalSortColumn] = useState<string | null>(null);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null);

  const currentPage = externalPage ?? internalPage;
  const rowsPerPage = externalRowsPerPage ?? internalRowsPerPage;
  const sortColumn = externalSortColumn ?? internalSortColumn;
  const sortDirection = externalSortDirection ?? internalSortDirection;

  // Flatten and prepare data
  const { flattenedData, dataColumns } = useMemo(() => {
    if (!data || data.length === 0) {
      return { flattenedData: [], dataColumns: [] };
    }

    const flattened = flattenData(data);
    const cols = getColumns(flattened);
    
    return { flattenedData: flattened, dataColumns: cols };
  }, [data]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return flattenedData;
    }

    return [...flattenedData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle nulls
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [flattenedData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (column: string) => {
    let newDirection: SortDirection;
    let newColumn: string | null;
    
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        newDirection = 'desc';
        newColumn = column;
      } else if (sortDirection === 'desc') {
        newDirection = null;
        newColumn = null;
      } else {
        newDirection = 'asc';
        newColumn = column;
      }
    } else {
      newColumn = column;
      newDirection = 'asc';
    }

    if (onSortChange) {
      onSortChange(newColumn, newDirection);
    } else {
      setInternalSortColumn(newColumn);
      setInternalSortDirection(newDirection);
    }
    
    // Reset to first page
    if (onPageChange) {
      onPageChange(1);
    } else {
      setInternalPage(1);
    }
  };

  const handleRowsPerPageChange = (value: string) => {
    const newRows = Number(value);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRows);
    } else {
      setInternalRowsPerPage(newRows);
      setInternalPage(1);
    }
  };

  if (isLoading) {
    return <TableLoading />;
  }

  if (showInitialState) {
    return <TableLoading animate={false} />;
  }

  if (flattenedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Database className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              No results for this query
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Your search returned no data. Try adjusting your query.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Data Table</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rows per page:</span>
          <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-auto max-h-[600px] border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 border-b">
              <TableRow>
                {dataColumns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 hover:bg-accent"
                      onClick={() => handleSort(column)}
                    >
                      <span className="capitalize">
                        {column.replace(/group\./g, '').replace(/_/g, ' ')}
                      </span>
                      {sortColumn === column ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-muted/50">
                  {dataColumns.map((column) => (
                    <TableCell key={column} className="whitespace-nowrap">
                      {formatNumber(row[column], column, columns)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, sortedData.length)} of{' '}
            {sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                if (onPageChange) {
                  onPageChange(newPage);
                } else {
                  setInternalPage(newPage);
                }
              }}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                if (onPageChange) {
                  onPageChange(newPage);
                } else {
                  setInternalPage(newPage);
                }
              }}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}