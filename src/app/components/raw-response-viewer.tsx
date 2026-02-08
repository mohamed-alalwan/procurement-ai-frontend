import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ChatResponse } from "../services/chatService";

interface RawResponseViewerProps {
  response: ChatResponse | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function RawResponseViewer({ response, isOpen, onToggle }: RawResponseViewerProps) {
  if (!isOpen) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Raw Response (Debug)</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {response ? (
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(response, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">No response data available</p>
        )}
      </CardContent>
    </Card>
  );
}
