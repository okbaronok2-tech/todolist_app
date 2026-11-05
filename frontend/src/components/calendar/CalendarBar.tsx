// 캘린더 할일 막대 (스타일 가이드 3.7). 클릭 시 편집 화면 (D-12). props만 받는다
import type { Todo } from '../../types/todo';
import { StatusBadge } from '../common/StatusBadge';
import { statusLabel, statusModifier } from '../../lib/status';

interface Props {
  todo: Todo;
  compact?: boolean; // 월·주 뷰 축약 배지, 일 뷰 전체 배지
  contLeft?: boolean;
  contRight?: boolean;
  style?: React.CSSProperties;
  onSelect: (todo: Todo) => void;
  children?: React.ReactNode;
}

export function CalendarBar({ todo, compact = true, contLeft = false, contRight = false, style, onSelect, children }: Props) {
  const cls = ['cal__bar', `cal__bar--${statusModifier(todo.status)}`, contLeft && 'cal__bar--cont-left', contRight && 'cal__bar--cont-right']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      style={style}
      aria-label={`${todo.title}, ${statusLabel(todo.status)}, ${todo.startDate}~${todo.endDate}`}
      onClick={() => onSelect(todo)}
    >
      {contLeft && <span className="cal__cont">‹</span>}
      <StatusBadge status={todo.status} compact={compact} />
      <span className="cal__bar-title">{todo.title}</span>
      {children}
      {contRight && <span className="cal__cont">›</span>}
    </button>
  );
}
