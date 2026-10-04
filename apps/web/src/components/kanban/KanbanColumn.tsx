import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@flowdesk/shared-types';
import TaskCard from './TaskCard';
import clsx from 'clsx';

interface Props {
  status: { key: TaskStatus; label: string; color: string };
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function KanbanColumn({ status, tasks, onTaskClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col w-68 rounded-xl transition-colors flex-shrink-0',
        isOver ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-gray-100/80'
      )}
      style={{ width: '272px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{status.label}</span>
        <span className="ml-auto text-xs text-gray-400 font-medium bg-white px-1.5 py-0.5 rounded-full border border-gray-200">
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2 pb-2 space-y-1.5 overflow-y-auto min-h-[120px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
          {tasks.length === 0 && (
            <div className="h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-300">Drop here</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
