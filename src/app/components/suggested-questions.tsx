import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

interface SuggestedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function SuggestedQuestions({ questions, onQuestionClick }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 max-w-full">
      {questions.map((question, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onQuestionClick(question)}
          className="text-xs h-auto py-1.5 px-3 rounded-full bg-background hover:bg-accent hover:border-primary/50 transition-colors cursor-pointer whitespace-normal text-left max-w-full break-words"
        >
          {question}
        </Button>
      ))}
    </div>
  );
}

export function SuggestedQuestionsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-32 rounded-full" />
      ))}
    </div>
  );
}
