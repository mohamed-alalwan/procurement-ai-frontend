import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";

const STARTER_QUESTIONS = [
  "What was the total procurement spend per fiscal year from 2012–2013 through 2014–2015?",
  "Which department had the highest total spend in fiscal year 2013–2014?",
  "How many purchase orders were created in each calendar quarter of 2014?",
  "Who were the top 5 suppliers by total spend in fiscal year 2012–2013?"
];

interface StarterQuestionsProps {
  onQuestionClick: (question: string) => void;
}

export function StarterQuestions({ onQuestionClick }: StarterQuestionsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-center">Get started with a question</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        Explore California procurement data from FY 2012–2015
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
        {STARTER_QUESTIONS.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            className="h-auto py-4 px-4 text-left justify-start whitespace-normal hover:bg-accent hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onQuestionClick(question)}
          >
            <span className="text-sm">{question}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
