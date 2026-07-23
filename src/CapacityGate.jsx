import { useEffect, useState } from "react";
import { getActiveUserCount, MAX_USERS_LIMIT } from "./sessionManager";

const RETRY_INTERVAL_MS = 15_000;

export default function CapacityGate({ activeCount, onRetry }) {
  const [remaining, setRemaining] = useState(RETRY_INTERVAL_MS / 1000);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((current) => (current <= 1 ? RETRY_INTERVAL_MS / 1000 : current - 1));
    }, 1000);

    const retry = setInterval(async () => {
      setChecking(true);
      const { canAccess } = await getActiveUserCount();
      setChecking(false);
      if (canAccess) {
        onRetry();
      }
    }, RETRY_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(retry);
    };
  }, [onRetry]);

  return (
    <div className="capacity-gate">
      <div className="capacity-gate__card">
        <div className="capacity-gate__icon">⏳</div>
        <h1>현재 이용자가 많습니다</h1>
        <p className="capacity-gate__count">
          {activeCount}/{MAX_USERS_LIMIT}명 이용 중
        </p>
        <p className="capacity-gate__desc">
          서버 안정성을 위해 동시 접속 인원을 제한하고 있습니다.
          <br />
          잠시 후 자동으로 다시 확인합니다.
        </p>
        <p className="capacity-gate__timer">
          {checking ? "확인 중…" : `${remaining}초 후 재확인`}
        </p>
      </div>
    </div>
  );
}
