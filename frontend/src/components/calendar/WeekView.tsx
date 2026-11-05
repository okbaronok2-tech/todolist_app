// WF-05 주 뷰. 데스크톱 7열 막대, 모바일 날짜별 세로 목록 (CSS 전환)
import type { Todo } from '../../types/todo';
import { eachDay, mmdd, weekdayLabel } from '../../lib/date';
import { layoutBars, todosOn } from '../../lib/calendar-lanes';
import { CalendarBar } from './CalendarBar';

interface Props {
  from: string;
  to: string;
  today: string;
  todos: Todo[];
  onSelect: (todo: Todo) => void;
}

export function WeekView({ from, to, today, todos, onSelect }: Props) {
  const days = eachDay(from, to);
  const bars = layoutBars(todos, from, to);
  const lanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0);
  return (
    <div className="cal cal--week">
      <div className="cal__row cal__row--week" style={{ '--lanes': lanes } as React.CSSProperties}>
        {days.map((d, i) => (
          <div key={d} className={`cal__cell cal__cell--${i}${d === today ? ' cal__cell--today' : ''}`} data-date={d}>
            <span className={`cal__date cal__dow--${i}`}>
              {mmdd(d)}({weekdayLabel(d)})
            </span>
            <ul className="cal__list">
              {todosOn(todos, d).map((t) => (
                <li key={t.id}>
                  <CalendarBar todo={t} compact={false} onSelect={onSelect} />
                </li>
              ))}
              {todosOn(todos, d).length === 0 && <li className="cal__none">(없음)</li>}
            </ul>
          </div>
        ))}
        <div className="cal__bars">
          {bars.map((b) => (
            <CalendarBar
              key={b.todo.id}
              todo={b.todo}
              onSelect={onSelect}
              contLeft={b.todo.startDate < from}
              contRight={b.todo.endDate > to}
              style={{ gridColumn: `${b.col + 1} / span ${b.span}`, gridRow: b.lane + 1 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
