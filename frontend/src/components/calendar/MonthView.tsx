// WF-05 월 뷰. BR-35 범위(28~42칸), 이웃 달 구분, today 강조, 막대(데스크톱)·점(모바일)
import type { Todo } from '../../types/todo';
import { WEEKDAY_LABELS, sameMonth, mmdd } from '../../lib/date';
import { chunkWeeks, monthCells } from '../../lib/calendar-range';
import { layoutBars, todosOn } from '../../lib/calendar-lanes';
import { statusModifier } from '../../lib/status';
import { CalendarBar } from './CalendarBar';

interface Props {
  anchorDate: string;
  today: string;
  todos: Todo[];
  onSelect: (todo: Todo) => void;
}

const MAX_DOTS = 4;

export function MonthView({ anchorDate, today, todos, onSelect }: Props) {
  const rows = chunkWeeks(monthCells(anchorDate));
  return (
    <div className="cal cal--month">
      <div className="cal__head">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={d} className={`cal__dow cal__dow--${i}`}>
            {d}
          </div>
        ))}
      </div>
      {rows.map((days) => {
        const bars = layoutBars(todos, days[0], days[6]);
        const lanes = bars.reduce((m, b) => Math.max(m, b.lane + 1), 0);
        return (
          <div key={days[0]} className="cal__row" style={{ '--lanes': lanes } as React.CSSProperties}>
            {days.map((d, i) => {
              const onDay = todosOn(todos, d);
              const cls = ['cal__cell', `cal__cell--${i}`, d === today && 'cal__cell--today', !sameMonth(d, anchorDate) && 'cal__cell--other-month']
                .filter(Boolean)
                .join(' ');
              return (
                <div key={d} className={cls} data-date={d}>
                  <span className="cal__date">{d.endsWith('-01') || i === 0 ? mmdd(d) : String(Number(d.slice(8)))}</span>
                  <span className="cal__dots" aria-label={`할일 ${onDay.length}건`}>
                    {onDay.slice(0, MAX_DOTS).map((t) => (
                      <i key={t.id} className={`cal__dot cal__dot--${statusModifier(t.status)}`} />
                    ))}
                    {onDay.length > MAX_DOTS && <em className="cal__more">+{onDay.length - MAX_DOTS}</em>}
                  </span>
                </div>
              );
            })}
            <div className="cal__bars">
              {bars.map((b) => (
                <CalendarBar
                  key={b.todo.id}
                  todo={b.todo}
                  onSelect={onSelect}
                  contLeft={b.todo.startDate < days[0]}
                  contRight={b.todo.endDate > days[6]}
                  style={{ gridColumn: `${b.col + 1} / span ${b.span}`, gridRow: b.lane + 1 }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
