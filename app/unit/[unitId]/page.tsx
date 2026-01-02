"use client";

import { useMemo, useState } from "react";
import FeedbackCard from "@/components/FeedbackCard";
import TaskCard from "@/components/TaskCard";
import UnitHeader from "@/components/UnitHeader";
import UnitIntro from "@/components/UnitIntro";
import UnitComplete from "@/components/UnitComplete";
import { unit1 } from "@/data/unit1";

export default function UnitPage() {
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<
    Record<
      string,
      {
        scoreOverall?: number;
        performanceLabel?: string;
        scores?: {
          taskCompletion: number;
          elaboration: number;
          coherence: number;
          grammar: number;
          vocabulary: number;
        };
        corrections?: {
          original: string;
          corrected: string;
          explanation: string;
        }[];
        vocabularyTip?: string;
        stretchSuggestion?: string;
        strength?: string;
        pronunciationData?: {
          overallScore: number;
          fluencyScore?: number;
          problemWords: Array<{ word: string; score: number; ipa?: string; problemPhonemes?: string[]; heardAs?: string }>;
        };
      }
    >
  >({});

  const tasks = useMemo(
    () => [...unit1.tasks].sort((a, b) => a.orderIndex - b.orderIndex),
    []
  );

  const handleComplete = (
    taskId: string,
    _isRetry?: boolean,
    transcript?: string,
    feedback?: (typeof feedbacks)[string]
  ) => {
    setCompletedTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    setTranscripts((prev) => ({
      ...prev,
      [taskId]: transcript ?? "",
    }));
    if (feedback) {
      setFeedbacks((prev) => ({
        ...prev,
        [taskId]: feedback,
      }));
    }
  };

  const isTaskLocked = (index: number) => {
    if (index === 0) return false;
    const previousTaskId = tasks[index - 1]?.id;
    return previousTaskId ? !completedTaskIds.includes(previousTaskId) : false;
  };

  const completedCount = tasks.filter((t) => completedTaskIds.includes(t.id)).length;
  const totalCount = tasks.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "transparent",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "3rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <UnitHeader
          unit={{
            level: unit1.level,
            title: unit1.title,
            description: unit1.description,
          }}
          completedCount={completedCount}
          totalCount={totalCount}
        />

        <UnitIntro unit={unit1} />

        {tasks.map((task, idx) => {
          const locked = isTaskLocked(idx);
          const completed = completedTaskIds.includes(task.id);
          return (
            <div key={task.id} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <TaskCard
                task={task}
                isLocked={locked}
                isCompleted={completed}
                onComplete={handleComplete}
              />
              {completed && (
                <FeedbackCard
                  taskId={task.id}
                  taskTitle={task.title}
                  transcript={transcripts[task.id]}
                  scoreOverall={feedbacks[task.id]?.scoreOverall}
                  performanceLabel={feedbacks[task.id]?.performanceLabel}
                  scores={feedbacks[task.id]?.scores}
                  corrections={feedbacks[task.id]?.corrections}
                  vocabularyTip={feedbacks[task.id]?.vocabularyTip}
                  stretchSuggestion={feedbacks[task.id]?.stretchSuggestion}
                  strength={feedbacks[task.id]?.strength}
                  pronunciationData={feedbacks[task.id]?.pronunciationData}
                />
              )}
            </div>
          );
        })}

        {completedTaskIds.length === 6 && (
          <UnitComplete unit={unit1} taskScores={[72, 75, 70, 78, 74, 76]} />
        )}
      </div>
    </main>
  );
}

