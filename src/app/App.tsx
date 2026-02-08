import { useState, useEffect } from "react";
import { Moon, Sun, Trash2, Eye, EyeOff, ChartBar } from "lucide-react";
import { Button } from "./components/ui/button";
import { ChatPanel } from "./components/chat-panel";
import { AnalyticsChart } from "./components/analytics-chart";
import { AnalyticsTable } from "./components/analytics-table";
import { RawResponseViewer } from "./components/raw-response-viewer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useIsMobile } from "./components/ui/use-mobile";
import { sendChat, type ChatMessage, type ChatResponse } from "./services/chatService";

interface MessageSettings {
  chartLimit: number;
  tablePage: number;
  tableRowsPerPage: number;
  tableSortColumn: string | null;
  tableSortDirection: "asc" | "desc" | null;
}

const DEFAULT_SETTINGS: MessageSettings = {
  chartLimit: 10,
  tablePage: 1,
  tableRowsPerPage: 10,
  tableSortColumn: null,
  tableSortDirection: null,
};

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<ChatResponse | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const [activeMessageIndex, setActiveMessageIndex] = useState<number | undefined>(undefined);
  const [messageSettings, setMessageSettings] = useState<Record<number, MessageSettings>>({});
  const [showAnalyticsSheet, setShowAnalyticsSheet] = useState(false);
  const isMobile = useIsMobile();

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSendMessage = async (message: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setShowRawResponse(false); // Hide raw response when generating new response
    setLastUserMessage(message);

    try {
      const response = await sendChat(message, messages);
      
      // Add assistant message with response data
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        timestamp: Date.now(),
        responseData: response
      };

      const newMessageIndex = messages.length + 1;
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentResponse(response);
      setSuggestedQuestions(response.suggestedQuestions || []);
      setActiveMessageIndex(newMessageIndex);
      // Initialize default settings for new message
      setMessageSettings(prev => ({
        ...prev,
        [newMessageIndex]: { ...DEFAULT_SETTINGS }
      }));
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "An unexpected error occurred"}`,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
      setSuggestedQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      // Remove last assistant message (the error) and retry
      setMessages(prev => prev.slice(0, -1));
      handleSendMessage(lastUserMessage);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentResponse(null);
    setSuggestedQuestions([]);
    setLastUserMessage("");
    setActiveMessageIndex(undefined);
    setMessageSettings({});
  };

  const handleMessageClick = (index: number) => {
    const message = messages[index];
    if (message.role === "assistant" && message.responseData) {
      setCurrentResponse(message.responseData);
      setSuggestedQuestions(message.responseData.suggestedQuestions || []);
      setActiveMessageIndex(index);
      // Initialize settings if not exist
      if (!messageSettings[index]) {
        setMessageSettings(prev => ({
          ...prev,
          [index]: { ...DEFAULT_SETTINGS }
        }));
      }
    }
  };

  const updateMessageSettings = (index: number, updates: Partial<MessageSettings>) => {
    setMessageSettings(prev => ({
      ...prev,
      [index]: { ...prev[index], ...updates }
    }));
  };

  const currentSettings = activeMessageIndex !== undefined 
    ? messageSettings[activeMessageIndex] || DEFAULT_SETTINGS
    : DEFAULT_SETTINGS;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="mb-0.5 sm:mb-1 text-[15px] sm:text-lg font-semibold leading-tight">California Procurement Analytics</h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">
              Line-item purchase orders (FY 2012–2015)
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawResponse(!showRawResponse)}
              className="gap-2 hidden sm:flex"
            >
              {showRawResponse ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Raw
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Raw
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowRawResponse(!showRawResponse)}
              className="sm:hidden"
            >
              {showRawResponse ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="gap-2 hidden sm:flex"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearChat}
              className="sm:hidden"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1800px] mx-auto p-3 sm:p-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Chat Panel */}
            <div className="flex flex-col min-h-0 h-full overflow-hidden relative">
              <ChatPanel
                messages={messages}
                isLoading={isLoading}
                suggestedQuestions={suggestedQuestions}
                onSendMessage={handleSendMessage}
                onRetry={handleRetry}
                onMessageClick={handleMessageClick}
                activeMessageIndex={activeMessageIndex}
              />
              {/* Raw Response - Mobile Only */}
              {isMobile && showRawResponse && (
                <div className="mt-2">
                  <RawResponseViewer
                    response={currentResponse}
                    isOpen={showRawResponse}
                    onToggle={() => setShowRawResponse(false)}
                  />
                </div>
              )}
              {/* Floating Analytics Button - Mobile Only */}
              {isMobile && currentResponse && (
                <Button
                  size="sm"
                  onClick={() => setShowAnalyticsSheet(true)}
                  className="absolute bottom-24 right-3 rounded-full h-10 w-10 shadow-lg z-10 bg-primary/60 hover:bg-primary/70 backdrop-blur-md border border-primary/20 p-0"
                >
                  <ChartBar className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Analytics Panel - Desktop Only */}
            {!isMobile && (
              <div className="flex flex-col gap-4 overflow-auto">
                <AnalyticsChart 
                  data={currentResponse?.data || []}
                  columns={currentResponse?.columns || []}
                  isLoading={isLoading}
                  showInitialState={messages.length === 0 && !isLoading}
                  limit={currentSettings.chartLimit}
                  onLimitChange={(limit) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { chartLimit: limit })}
                />
                <AnalyticsTable 
                  data={currentResponse?.data || []}
                  columns={currentResponse?.columns || []}
                  isLoading={isLoading}
                  showInitialState={messages.length === 0 && !isLoading}
                  currentPage={currentSettings.tablePage}
                  rowsPerPage={currentSettings.tableRowsPerPage}
                  sortColumn={currentSettings.tableSortColumn}
                  sortDirection={currentSettings.tableSortDirection}
                  onPageChange={(page) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tablePage: page })}
                  onRowsPerPageChange={(rows) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tableRowsPerPage: rows, tablePage: 1 })}
                  onSortChange={(column, direction) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tableSortColumn: column, tableSortDirection: direction })}
                />
                {showRawResponse && (
                  <RawResponseViewer
                    response={currentResponse}
                    isOpen={showRawResponse}
                    onToggle={() => setShowRawResponse(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Analytics Sheet - Mobile */}
      <Sheet open={showAnalyticsSheet} onOpenChange={setShowAnalyticsSheet}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-[0.85rem]">Analytics</SheetTitle>
          </SheetHeader>
          {showAnalyticsSheet && (
            <Tabs defaultValue="chart" className="h-[calc(90vh-4rem)] flex flex-col">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="chart" className="flex-1 overflow-auto p-4 mt-0">
                <AnalyticsChart 
                  data={currentResponse?.data || []}
                  columns={currentResponse?.columns || []}
                  isLoading={isLoading}
                  showInitialState={false}
                  limit={currentSettings.chartLimit}
                  onLimitChange={(limit) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { chartLimit: limit })}
                />
              </TabsContent>
              <TabsContent value="table" className="flex-1 overflow-auto p-4 mt-0">
                <AnalyticsTable 
                  data={currentResponse?.data || []}
                  columns={currentResponse?.columns || []}
                  isLoading={isLoading}
                  showInitialState={false}
                  currentPage={currentSettings.tablePage}
                  rowsPerPage={currentSettings.tableRowsPerPage}
                  sortColumn={currentSettings.tableSortColumn}
                  sortDirection={currentSettings.tableSortDirection}
                  onPageChange={(page) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tablePage: page })}
                  onRowsPerPageChange={(rows) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tableRowsPerPage: rows, tablePage: 1 })}
                  onSortChange={(column, direction) => activeMessageIndex !== undefined && updateMessageSettings(activeMessageIndex, { tableSortColumn: column, tableSortDirection: direction })}
                />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}