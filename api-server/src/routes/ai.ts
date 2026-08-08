import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "missing",
});

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS: OpenAI.ChatCompletionTool[] = [
  // ── Notes ──────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a single note with title, content, colour and tags.",
      parameters: {
        type: "object",
        properties: {
          title:  { type: "string" },
          body:   { type: "string" },
          color:  { type: "string", enum: ["default","yellow","rose","sky","emerald","violet"] },
          tags:   { type: "array", items: { type: "string" } },
          pinned: { type: "boolean" },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_multiple_notes",
      description: "Create several notes at once (e.g. brainstorm dump, topic-split, reference collection).",
      parameters: {
        type: "object",
        properties: {
          notes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title:  { type: "string" },
                body:   { type: "string" },
                color:  { type: "string", enum: ["default","yellow","rose","sky","emerald","violet"] },
                tags:   { type: "array", items: { type: "string" } },
                pinned: { type: "boolean" },
              },
              required: ["title", "body"],
            },
          },
        },
        required: ["notes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "Update an existing note by ID — change title, body, colour, tags, or pin state.",
      parameters: {
        type: "object",
        properties: {
          id:     { type: "string", description: "The note's ID from the context" },
          title:  { type: "string" },
          body:   { type: "string" },
          color:  { type: "string", enum: ["default","yellow","rose","sky","emerald","violet"] },
          tags:   { type: "array", items: { type: "string" } },
          pinned: { type: "boolean" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Permanently delete a note by ID.",
      parameters: {
        type: "object",
        properties: {
          id:    { type: "string" },
          title: { type: "string", description: "Title for confirmation display" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "organize_notes",
      description: "Re-tag and/or recolour multiple existing notes to organise them by topic. Provide an array of {id, tags, color} patches.",
      parameters: {
        type: "object",
        properties: {
          patches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:    { type: "string" },
                tags:  { type: "array", items: { type: "string" } },
                color: { type: "string", enum: ["default","yellow","rose","sky","emerald","violet"] },
              },
              required: ["id"],
            },
          },
          summary: { type: "string", description: "One-line description of the organisation scheme used" },
        },
        required: ["patches"],
      },
    },
  },
  // ── Todos ──────────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "Create a single todo / task item.",
      parameters: {
        type: "object",
        properties: {
          title:    { type: "string" },
          priority: { type: "string", enum: ["high","medium","low"] },
          category: { type: "string" },
          dueDate:  { type: "string", description: "YYYY-MM-DD, optional" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_multiple_todos",
      description: "Create several todo items at once — lists, plans, habits.",
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title:    { type: "string" },
                priority: { type: "string", enum: ["high","medium","low"] },
                category: { type: "string" },
                dueDate:  { type: "string" },
              },
              required: ["title"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      description: "Mark one or more todos as completed.",
      parameters: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string" }, description: "Todo IDs to mark complete" },
        },
        required: ["ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todo",
      description: "Update a todo's title, priority, category, or due date.",
      parameters: {
        type: "object",
        properties: {
          id:       { type: "string" },
          title:    { type: "string" },
          priority: { type: "string", enum: ["high","medium","low"] },
          category: { type: "string" },
          dueDate:  { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      description: "Permanently delete a todo by ID.",
      parameters: {
        type: "object",
        properties: {
          id:    { type: "string" },
          title: { type: "string", description: "Title for confirmation display" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_completed_todos",
      description: "Remove all completed todos from the list.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ── Planner / Events ───────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Add a single event or task to the Planner calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          type:  { type: "string", enum: ["event","task"] },
          date:  { type: "string", description: "YYYY-MM-DD" },
          time:  { type: "string", description: "HH:MM, optional" },
          color: { type: "string", enum: ["sky","violet","rose","emerald","amber","orange"] },
          notes: { type: "string" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_schedule",
      description: "Create a structured multi-day schedule — weekly plan, study timetable, workout routine, project timeline.",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                type:  { type: "string", enum: ["event","task"] },
                date:  { type: "string" },
                time:  { type: "string" },
                color: { type: "string", enum: ["sky","violet","rose","emerald","amber","orange"] },
                notes: { type: "string" },
              },
              required: ["title", "date"],
            },
          },
        },
        required: ["events"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_event",
      description: "Mark a planner event or task as done.",
      parameters: {
        type: "object",
        properties: {
          id:    { type: "string" },
          title: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_event",
      description: "Delete a planner event by ID.",
      parameters: {
        type: "object",
        properties: {
          id:    { type: "string" },
          title: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
];

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(today: string) {
  return `You are a warm, smart productivity AI companion embedded in a personal productivity app. You have full read/write access to the user's data.

The app has four sections:
• **Notes** — colour-coded (default/yellow/rose/sky/emerald/violet), tagged, pinnable notes
• **Todos** — tasks with priority (high/medium/low), category, optional due date
• **Planner** — calendar events & tasks (colours: sky/violet/rose/emerald/amber/orange) with date, time, and notes
• **Timer** — focus sessions (you cannot control the timer, only advise on it)

Today is **${today}**. All dates should be relative to today.

## Capabilities
You can:
- Create notes, todos, events (single or bulk)
- Update existing items by their ID (change title, priority, colour, tags, etc.)
- Mark todos and events as completed
- Delete items
- Organise/re-tag/recolour existing notes to sort them by topic
- Build full weekly/monthly schedules

## Behaviour rules
1. When the user asks to create, update, delete, organise, or schedule — call the right tool(s). You may call multiple tools in a single turn.
2. Use bulk tools for lists ("make a shopping list" → create_multiple_todos, "plan my week" → create_schedule).
3. When organising notes — use organize_notes to re-tag/recolour existing ones rather than creating new ones.
4. When the user says "complete X" or "mark X done" — use complete_todo or complete_event with the item's ID.
5. After acting, write a short warm confirmation (1-2 sentences, occasional emoji). Don't repeat what the tool already lists.
6. For advice, tips, or chat — reply naturally. Be encouraging.
7. Never fabricate dates more than 60 days ahead unless the user specifies.
8. If the user's request is ambiguous, make a reasonable interpretation and act, then offer to adjust.`;
}

// ─── Route ────────────────────────────────────────────────────────────────────
router.post("/ai/chat", async (req, res) => {
  try {
    const { messages = [], appContext } = req.body as {
      messages: OpenAI.ChatCompletionMessageParam[];
      appContext?: {
        todos: Array<{ id: string; title: string; priority: string; completed: boolean; dueDate: string | null; category: string }>;
        notes: Array<{ id: string; title: string; color: string; tags: string[]; pinned: boolean }>;
        events: Array<{ id: string; title: string; date: string; time: string | null; type: string; completed: boolean }>;
      };
    };

    const today = new Date().toISOString().split("T")[0];
    const systemBase = buildSystemPrompt(today);

    let contextBlock = "";
    if (appContext) {
      const { todos, notes, events } = appContext;
      const activeTodos   = todos.filter((t) => !t.completed);
      const doneTodos     = todos.filter((t) => t.completed);
      const upcomingEvs   = events.filter((e) => !e.completed && e.date >= today);

      contextBlock = `

## Current app data
**Todos** (${activeTodos.length} active, ${doneTodos.length} completed):
${activeTodos.map((t) => `- [${t.id}] "${t.title}" | priority:${t.priority} | category:${t.category}${t.dueDate ? ` | due:${t.dueDate}` : ""}`).join("\n") || "  (none)"}
${doneTodos.length > 0 ? `Completed: ${doneTodos.map((t) => `[${t.id}] "${t.title}"`).join(", ")}` : ""}

**Notes** (${notes.length} total):
${notes.map((n) => `- [${n.id}] "${n.title}" | color:${n.color} | tags:[${n.tags.join(",")}]${n.pinned ? " | pinned" : ""}`).join("\n") || "  (none)"}

**Upcoming Planner events** (${upcomingEvs.length}):
${upcomingEvs.map((e) => `- [${e.id}] "${e.title}" | ${e.date}${e.time ? ` ${e.time}` : ""} | type:${e.type}`).join("\n") || "  (none)"}`;
    }

    const systemContent = systemBase + contextBlock;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      messages: [{ role: "system", content: systemContent }, ...messages],
      tools: TOOLS,
      tool_choice: "auto",
    });

    const msg = response.choices[0].message;
    const actions = (msg.tool_calls ?? []).map((tc) => ({
      type: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));

    res.json({ reply: msg.content ?? "", actions });
  } catch (err: unknown) {
    req.log.error(err, "AI chat error");
    const status = (err as { status?: number }).status;
    const code   = (err as { code?: string }).code;
    let message  = "AI request failed. Please try again.";
    if (code === "insufficient_quota" || status === 429) {
      message = "Your OpenAI account has no remaining credits. Add billing at platform.openai.com/billing, then try again.";
    } else if (code === "invalid_api_key" || status === 401) {
      message = "Invalid OpenAI API key. Please update the OPENAI_API_KEY secret with a valid key.";
    }
    res.status(500).json({ error: message });
  }
});

export default router;
