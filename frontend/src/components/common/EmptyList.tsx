// CP-06 빈 목록 안내. filtered 여부로 문구 2종
import { Link } from 'react-router';

export function EmptyList({ filtered }: { filtered: boolean }) {
  return (
    <div className="empty">
      {filtered ? (
        '조건에 맞는 할일이 없습니다.'
      ) : (
        <>
          등록된 할일이 없습니다. <Link to="/todos/new">등록</Link>으로 첫 할일을 추가하세요.
        </>
      )}
    </div>
  );
}
