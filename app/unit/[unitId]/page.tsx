"use client";

import { useMemo, useState } from "react";
import FeedbackCard from "@/components/FeedbackCard";
import TaskCard from "@/components/TaskCard";
import UnitHeader from "@/components/UnitHeader";
import UnitIntro from "@/components/UnitIntro";
import UnitReport from "@/components/UnitReport";
import { unit1 } from "@/data/unit1";
import type { FunctionType, SkillType, TaskScore } from "@/lib/scoring-types";

// New feedback structure with Functions + Skills
type FeedbackData = {
  function: FunctionType;
  secondaryFunction?: FunctionType;
  skills: Partial<Record<SkillType, number>>;
  overall: number;
  corrections?: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  strengths?: string[];
  improvements?: string[];
  feedback?: string;
  pronunciationData?: {
    overallScore: number;
    fluencyScore?: number;
    problemWords: Array<{
      word: string;
      score: number;
      ipa?: string;
      problemPhonemes?: string[];
      heardAs?: string;
    }>;
  };
};

export default function UnitPage() {
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackData>>({});

  const tasks = useMemo(
    () => [...unit1.tasks].sort((a, b) => a.orderIndex - b.orderIndex),
    []
  );

  const handleComplete = (
    taskId: string,
    _isRetry?: boolean,
    transcript?: string,
    feedback?: FeedbackData
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

  // Build TaskScore array for UnitReport
  const taskScores: TaskScore[] = completedTaskIds
    .map((taskId) => {
      const feedback = feedbacks[taskId];
      const transcript = transcripts[taskId];
      const task = tasks.find((t) => t.id === taskId);
      if (!feedback || !task) return null;

      return {
        taskId,
        taskType: task.taskType,
        function: feedback.function,
        secondaryFunction: feedback.secondaryFunction,
        skills: feedback.skills as Record<SkillType, number>,
        overall: feedback.overall,
        transcript: transcript || "",
        corrections: feedback.corrections || [],
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
      };
    })
    .filter((t): t is TaskScore => t !== null);

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
          const feedback = feedbacks[task.id];

          return (
            <div key={task.id} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <TaskCard
                task={task}
                isLocked={locked}
                isCompleted={completed}
                onComplete={handleComplete}
              />
              {completed && feedback && (
                <FeedbackCard
                  taskType={task.taskType}
                  taskTitle={task.title}
                  function={feedback.function}
                  secondaryFunction={feedback.secondaryFunction}
                  skills={feedback.skills}
                  overall={feedback.overall}
                  transcript={transcripts[task.id] || ""}
                  corrections={feedback.corrections || []}
                  strengths={feedback.strengths || []}
                  improvements={feedback.improvements || []}
                  feedback={feedback.feedback || ""}
                />
              )}
            </div>
          );
        })}

        {/* Show UnitReport when all tasks complete */}
        {completedTaskIds.length === tasks.length && (
          <UnitReport
            unitTitle={unit1.title}
            level={unit1.level}
            tasks={taskScores}
          />
        )}
      </div>
    </main>
  );
}
