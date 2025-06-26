import React, { createContext, useContext, useState } from 'react';

export type QuestPeriod = 'morning' | 'afternoon' | 'evening' | 'workout' | 'daily';

type TaskState = {
  checked?: boolean;
  count?: number;
  value?: string;
};

type QuestState = {
  [key in QuestPeriod]?: {
    [taskId: string]: TaskState;
  };
};

export type QuestContextType = {
  questState: QuestState;
  setQuestState: React.Dispatch<React.SetStateAction<QuestState>>;
  totalPoints: number;
  completedTasks: number;
  totalTasks: number;
  streak: number;
  users: { id: string; name: string; points: number }[];
  updateUserPoints: (userId: string, points: number) => void;
  updateStats: (stats: { points: number; completed: number; total: number }) => void;
};

const QuestContext = createContext<QuestContextType | undefined>(undefined);

export const QuestProvider = ({ children }: { children: React.ReactNode }) => {
  const [questState, setQuestState] = useState<QuestState>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [streak, setStreak] = useState(3); // Example streak
  const [users, setUsers] = useState([
    { id: '1', name: 'You', points: 0 },
    { id: '2', name: 'Alex', points: 120 },
    { id: '3', name: 'Sam', points: 95 },
    { id: '4', name: 'Jordan', points: 80 },
  ]);

  const updateUserPoints = (userId: string, points: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, points } : u));
  };

  const updateStats = (stats: { points: number; completed: number; total: number }) => {
    setTotalPoints(stats.points);
    setCompletedTasks(stats.completed);
    setTotalTasks(stats.total);
  };

  return (
    <QuestContext.Provider value={{ 
      questState, 
      setQuestState, 
      totalPoints, 
      completedTasks, 
      totalTasks, 
      streak, 
      users, 
      updateUserPoints,
      updateStats
    }}>
      {children}
    </QuestContext.Provider>
  );
};

export const useQuest = () => {
  const ctx = useContext(QuestContext);
  if (!ctx) throw new Error('useQuest must be used within a QuestProvider');
  return ctx;
}; 