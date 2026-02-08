import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Send } from "lucide-react";
import { ChatMessageComponent } from "./chat-message";
import { LoadingMessage } from "./loading-message";
import { SuggestedQuestions, SuggestedQuestionsSkeleton } from "./suggested-questions";
import { StarterQuestions } from "./starter-questions";
import { type ChatMessage } from "../services/chatService";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  suggestedQuestions: string[];
  onSendMessage: (message: string) => void;
  onRetry?: () => void;
  onMessageClick?: (index: number) => void;
  activeMessageIndex?: number;
}

export function ChatPanel({ 
  messages, 
  isLoading, 
  suggestedQuestions,
  onSendMessage,
  onRetry,
  onMessageClick,
  activeMessageIndex
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuestionClick = (question: string) => {
    if (isLoading) return;
    onSendMessage(question);
  };

  const userMessages = messages.filter(m => m.role === "user");
  const showStarter = userMessages.length === 0 && !isLoading;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-4 -mr-4 overflow-y-auto" ref={scrollAreaRef}>
          {showStarter ? (
            <StarterQuestions onQuestionClick={handleQuestionClick} />
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isAssistant = message.role === "assistant";
                const shouldShowSuggestions = isAssistant && isLastMessage && !isLoading;
                const isActive = activeMessageIndex === index;

                return (
                  <div key={index}>
                    <ChatMessageComponent 
                      message={message} 
                      onRetry={isLastMessage && message.content.startsWith("Error:") ? onRetry : undefined}
                      onMessageClick={onMessageClick ? () => onMessageClick(index) : undefined}
                      isActive={isActive}
                    />
                    {shouldShowSuggestions && suggestedQuestions.length > 0 && (
                      <SuggestedQuestions 
                        questions={suggestedQuestions}
                        onQuestionClick={handleQuestionClick}
                      />
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div>
                  <LoadingMessage />
                  <SuggestedQuestionsSkeleton />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 flex gap-2 flex-shrink-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the data..."
            disabled={isLoading}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}