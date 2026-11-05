// CP-05 할일 행. 데스크톱 표 행 / 모바일 2줄 카드는 CSS로 전환. props만 받는다
import type { Todo } from '../../types/todo';
import { mmdd } from '../../lib/date';
import { StatusBadge } from './StatusBadge';

interface Props {
  todo: Todo;
  categoryName: string;
  busy?: boolean;
  onToggle: (todo: Todo, isCompleted: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

export function TodoRow({ todo, categoryName, busy = false, onToggle, onEdit, onDelete }: Props) {
  return (
    <li className={`todo-row${todo.isCompleted ? ' todo-row--completed' : ''}`}>
      <input
        className="todo-row__check"
        type="checkbox"
        aria-label={`${todo.title} 완료 체크`}
        checked={todo.isCompleted}
        disabled={busy}
        onChange={(e) => onToggle(todo, e.target.checked)}
      />
      <span className="todo-row__title">{todo.title}</span>
      <span className="todo-row__period">
        {mmdd(todo.startDate)}~{mmdd(todo.endDate)}
      </span>
      <span className="todo-row__category">{categoryName}</span>
      <span className="todo-row__status">
        <StatusBadge status={todo.status} />
      </span>
      <span className="todo-row__actions">
        <button type="button" className="btn btn--sm" onClick={() => onEdit(todo)}>
          편집
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={() => onDelete(todo)}>
          삭제
        </button>
      </span>
    </li>
  );
}
