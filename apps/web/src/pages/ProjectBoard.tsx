import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type { Task, Project, TaskStatus } from '@flowdesk/shared-types';
import { Plus, ArrowLeft, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import TaskCard from '@/components/kanban/TaskCard';
import TaskDrawer from '@/components/modals/TaskDrawer';
import CreateTaskModal from '@/components/modals/CreateTaskModal';

export const STATUSES: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: '#94a3b8' },
  { key: 'todo', label: 'Todo', color: '#60a5fa' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'in_review', label: 'In Review', color: '#a78bfa' },
  { key: 'done', label: 'Done', color: '#34d399' },
  { key: 'cancelled', label: 'Cancelled', color: '#f87171' },
];

export default function ProjectBoard() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: project } = useQuery({
    queryKey: ['project', workspaceId, projectId],
    queryFn: () => api.get<{ data: Project }>(`/workspaces/${workspaceId}/projects/${projectId}`).then((r) => r.data.data),
    enabled: !!workspaceId && !!projectId,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get<{ data: Task[] }>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`).then((r) => r.data.data),
    enabled: !!workspaceId && !!projectId,
  });

  function handleDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    const newStatus = over.id as TaskStatus;
    if (!task || task.status === newStatus || !STATUSES.find((s) => s.key === newStatus)) return;

    qc.setQueryData<Task[]>(['tasks', projectId], (prev = []) =>
      prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t)
    );

    try {
      getSocket().emit('task:move', { taskId: task.id, toStatus: newStatus, toIndex: 0 });
    } catch {
      try {
        await api.patch(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`, {
          status: newStatus, expectedVersion: task.version,
        });
      } catch (err: any) {
        if (err.response?.data?.code === 'VERSION_CONFLICT') {
          toast.error('Conflict — someone else updated this task.');
        }
        qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    }
  }

  const tasksByStatus: Record<TaskStatus, Task[]> = {} as any;
  for (const s of STATUSES) tasksByStatus[s.key] = [];
  for (const t of tasks) { if (tasksByStatus[t.status]) tasksByStatus[t.status].push(t); }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate(`/w/${workspaceId}/projects`)} className="btn-icon text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        {project && (
          <>
            <span className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: project.color }} />
            <h1 className="font-semibold text-gray-900 truncate">{project.name}</h1>
            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{project.key}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{tasks.length} tasks</span>
          <button onClick={() => setCreating(true)} className="btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading board…</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-3 p-4 min-w-max">
              {STATUSES.map((col) => (
                <KanbanColumn key={col.key} status={col} tasks={tasksByStatus[col.key]}
                  onTaskClick={(t) => setSelectedTask(t)} />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedTask && (
        <TaskDrawer task={selectedTask} workspaceId={workspaceId!} projectId={projectId!}
          onClose={() => setSelectedTask(null)}
          onUpdated={(t) => setSelectedTask(t)} />
      )}
      {creating && (
        <CreateTaskModal workspaceId={workspaceId!} projectId={projectId!} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
