import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ChartLoadingProps {
  animate?: boolean;
}

export function ChartLoading({ animate = true }: ChartLoadingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-around gap-2 px-4">
          {[...Array(8)].map((_, i) => {
            const height = 40 + Math.random() * 60;
            const Component = animate ? motion.div : 'div';
            return (
              <Component
                key={i}
                className="flex-1 bg-gradient-to-t from-[oklch(0.65_0.25_264)]/40 to-[oklch(0.65_0.25_264)]/20 rounded-t-md"
                style={animate ? undefined : { height: `${height}%`, opacity: 0.4 }}
                {...(animate ? {
                  initial: { height: 0, opacity: 0 },
                  animate: { 
                    height: `${height}%`, 
                    opacity: [0.3, 0.6, 0.3],
                  },
                  transition: { 
                    height: { duration: 0.5, delay: i * 0.1 },
                    opacity: { 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.1 
                    }
                  }
                } : {})}
              />
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            {animate ? (
              <>
                <motion.div 
                  className="w-3 h-3 rounded-full bg-[oklch(0.65_0.25_264)]/40"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div 
                  className="h-3 bg-muted rounded flex-1 max-w-32"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-[oklch(0.65_0.25_264)]/40" style={{ opacity: 0.5 }} />
                <div className="h-3 bg-muted rounded flex-1 max-w-32" style={{ opacity: 0.4 }} />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
