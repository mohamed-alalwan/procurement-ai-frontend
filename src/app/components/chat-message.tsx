import { type ChatMessage } from "../services/chatService";
import { User, Bot, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: ChatMessage;
  onRetry?: () => void;
  onMessageClick?: () => void;
  isActive?: boolean;
}

export function ChatMessageComponent({ message, onRetry, onMessageClick, isActive }: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="flex gap-3 justify-end m-1.5">
        <div className="bg-primary dark:bg-[oklch(0.32_0_0)] text-primary-foreground dark:text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] break-words overflow-hidden">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    const isError = message.content.startsWith("Error:");
    const hasResponseData = !!message.responseData;
    const isClickable = hasResponseData && onMessageClick;

    return (
      <div className="flex gap-3 m-1.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {isError ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0 max-w-[85%]">
          <div 
            className={`rounded-2xl rounded-tl-sm px-4 py-2 overflow-hidden ${
              isError ? 'bg-destructive/10 text-destructive' : 'bg-muted'
            } ${isClickable ? 'cursor-pointer hover:bg-muted/80 transition-colors' : ''} ${
              isActive ? 'ring-2 ring-primary' : ''
            }`}
            onClick={isClickable ? onMessageClick : undefined}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 prose prose-sm dark:prose-invert break-words overflow-wrap-anywhere">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {isClickable && (
                <ChevronRight className={`h-4 w-4 flex-shrink-0 mt-0.5 transition-transform ${
                  isActive ? 'rotate-90' : ''
                }`} />
              )}
            </div>
          </div>
          {isError && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 m-1.5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="h-4 w-4 animate-pulse" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-2 bg-muted space-y-2 max-w-[80%]">
        <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-48" />
        <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-64" />
        <div className="h-4 bg-muted-foreground/20 rounded animate-pulse w-40" />
      </div>
    </div>
  );
}