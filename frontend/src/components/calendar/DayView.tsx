// WF-05 일 뷰. 전폭 막대, 전체 배지, 기간·카테고리, 범위 밖 연속 표시 ‹ ›
import type { Todo } from '../../types/todo';
import { mmdd, weekdayLabel } from '../../lib/date';
import { todosOn } from '../../lib/calendar-lanes';
import { CalendarBar } from './CalendarBar';

interface Props {
  date: string;
  today: string;
  todos: Todo[];
  categoryName: (id: number) => string;
  onSelect: (todo: Todo) => void;
}

export function DayView({ date, today, todos, categoryName, onSelect }: Props) {
  const items = todosOn(todos, date);
  return (
    <div className="cal cal--day">
      <div className={`cal__day-head${date === today ? ' cal__cell--today' : ''}`}>
        {mmdd(date)}({weekdayLabel(date)})
      </div>
      <ul className="cal__list cal__list--day">
        {items.map((t) => (
          <li key={t.id}>
            <CalendarBar todo={t} compact={false} contLeft={t.startDate < date} contRight={t.endDate > date} onSelect={onSelect}>
              <span className="cal__meta">
                {mmdd(t.startDate)}~{mmdd(t.endDate)} {categoryName(t.categoryId)}
              </span>
            </CalendarBar>
          </li>
        ))}
      </ul>
    </div>
  );
}
