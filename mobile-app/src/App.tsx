import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Todo from "@/pages/Todo";
import Planner from "@/pages/Planner";
import Notes from "@/pages/Notes";
import TimerPage from "@/pages/TimerPage";
import Habits from "@/pages/Habits";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { TodoProvider } from "@/context/TodoContext";
import { PlannerProvider } from "@/context/PlannerContext";
import { NotesProvider } from "@/context/NotesContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { HabitProvider } from "@/context/HabitContext";
import { useTodos } from "@/context/TodoContext";
import { usePlanner } from "@/context/PlannerContext";
import { useSettings } from "@/context/SettingsContext";

const queryClient = new QueryClient();

function NotificationScheduler() {
  const { todos } = useTodos();
  const { events } = usePlanner();
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.notifyDueDate) return;
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission();
      return;
    }
    if (Notification.permission !== "granted") return;

    const todayStr = new Date().toISOString().split("T")[0];
    const todayTodos = todos.filter((t) => !t.completed && t.dueDate === todayStr);
    const sessionKey = `notif_due_${todayStr}`;

    if (!sessionStorage.getItem(sessionKey) && todayTodos.length > 0) {
      sessionStorage.setItem(sessionKey, "1");
      try {
        new Notification("Tasks due today 📋", {
          body:
            todayTodos.length === 1
              ? `"${todayTodos[0].title}" is due today`
              : `You have ${todayTodos.length} tasks due today`,
        });
      } catch {}
    }

    const now = new Date();
    const nowMs = now.getTime();
    events
      .filter((ev) => ev.date === todayStr && ev.time && !ev.completed)
      .forEach((ev) => {
        const [hh, mm] = ev.time!.split(":").map(Number);
        const evMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm).getTime();
        const notifAt = evMs - nowMs - 5 * 60 * 1000;
        if (notifAt > 0) {
          const evKey = `notif_ev_${ev.id}_${todayStr}`;
          if (!sessionStorage.getItem(evKey)) {
            sessionStorage.setItem(evKey, "1");
            setTimeout(() => {
              try {
                new Notification(`Upcoming: ${ev.title} 📅`, { body: "Starts in 5 minutes" });
              } catch {}
            }, notifAt);
          }
        }
      });
  }, [todos, events, settings.notifyDueDate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/todo" component={Todo} />
      <Route path="/planner" component={Planner} />
      <Route path="/notes" component={Notes} />
      <Route path="/timer" component={TimerPage} />
      <Route path="/habits" component={Habits} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <TodoProvider>
              <PlannerProvider>
                <NotesProvider>
                  <HabitProvider>
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <div className="flex justify-center bg-slate-100 dark:bg-slate-900 min-h-[100dvh] w-full">
                        <div className="w-full max-w-[430px] h-[100dvh] bg-background relative overflow-hidden shadow-2xl sm:border-x sm:border-border flex flex-col">
                          <NotificationScheduler />
                          <div className="flex-1 h-full overflow-hidden relative">
                            <Router />
                            <OnboardingFlow />
                          </div>
                          <BottomNav />
                        </div>
                      </div>
                    </WouterRouter>
                  </HabitProvider>
                </NotesProvider>
              </PlannerProvider>
            </TodoProvider>
          </NotificationsProvider>
        </SettingsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
