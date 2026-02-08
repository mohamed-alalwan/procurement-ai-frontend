import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface TableLoadingProps {
  animate?: boolean;
}

export function TableLoading({ animate = true }: TableLoadingProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Data Table</CardTitle>
        {animate ? (
          <motion.div 
            className="h-8 w-20 bg-muted rounded"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ) : (
          <div className="h-8 w-20 bg-muted rounded" style={{ opacity: 0.4 }} />
        )}
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          {/* Header */}
          <div className="bg-muted/50 border-b p-3 flex gap-4">
            {[...Array(4)].map((_, i) => {
              const Component = animate ? motion.div : 'div';
              return (
                <Component
                  key={i}
                  className="h-4 bg-muted-foreground/20 rounded flex-1"
                  style={animate ? undefined : { opacity: 0.4 }}
                  {...(animate ? {
                    animate: { opacity: [0.3, 0.6, 0.3] },
                    transition: { 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.1 
                    }
                  } : {})}
                />
              );
            })}
          </div>
          
          {/* Rows */}
          {[...Array(6)].map((_, rowIndex) => {
            const RowComponent = animate ? motion.div : 'div';
            return (
              <RowComponent 
                key={rowIndex}
                className="border-b p-3 flex gap-4"
                {...(animate ? {
                  initial: { opacity: 0, x: -20 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: rowIndex * 0.1 }
                } : {})}
              >
                {[...Array(4)].map((_, colIndex) => {
                  const CellComponent = animate ? motion.div : 'div';
                  return (
                    <CellComponent
                      key={colIndex}
                      className="h-4 bg-muted rounded flex-1"
                      style={animate ? undefined : { opacity: 0.5 }}
                      {...(animate ? {
                        animate: { opacity: [0.4, 0.7, 0.4] },
                        transition: { 
                          duration: 1.5, 
                          repeat: Infinity, 
                          delay: (rowIndex * 0.1) + (colIndex * 0.05)
                        }
                      } : {})}
                    />
                  );
                })}
              </RowComponent>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
