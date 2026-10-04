import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@flowdesk/shared-types';
import { AlertCircle, ArrowUp, ArrowDown, Minus, Clock, MessageSquare } from 'lucide-react';
import { format, isPast } from 'date-fns';
import clsx from 'clsx';

const priorityIcon: Record<string, React.ReactNode> = {
  urgent: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  high: <ArrowUp className="w-3.5 h-3.5 text-orange-500" />,
  medium: <Minus className="w-3.5 h-3.5 text-yellow-500" />,
  low: <ArrowDown className="w-3.5 h-3.5 text-blue-400" />,
  no_priority: null,
};

interface Props {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

export default function TaskCard({ task, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0 : 1,
  };

  const isOverdue =
    task.dueDate &&
    isPast(new Date(task.dueDate)) &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 p-3 cursor-pointer select-none',
        'hover:border-brand-300 hover:shadow-sm transition-all',
        isDragging && 'shadow-xl ring-2 ring-brand-400 rotate-1 scale-105'
      )}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((l) => (
            <span key={l} className="badge-brand text-[10px]">{l}</span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2 mb-2">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {priorityIcon[task.priority]}
          {task.dueDate && (
            <span className={clsx('flex items-center gap-0.5 text-[10px] font-medium', isOverdue ? 'text-red-500' : 'text-gray-400')}>
              <Clock className="w-3 h-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <MessageSquare className="w-3 h-3" />
              {task.commentCount}
            </span>
          )}
        </div>
        {task.assignee && (
          <div
            title={task.assignee.name ?? task.assignee.username}
            className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ fontSize: '9px' }}
          >
            {(task.assignee.name ?? task.assignee.username)[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
