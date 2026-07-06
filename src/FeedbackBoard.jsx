import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const TABLE = "feedback";
const COMMENTS_TABLE = "comments";

export default function FeedbackBoard({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSubmittingId, setCommentSubmittingId] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from(TABLE)
      .select("id, nickname, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (loadError) {
      setError("의견을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }

    setPosts(data ?? []);
    setError(null);
    await loadComments((data ?? []).map((post) => post.id));
    setLoading(false);
  }

  async function loadComments(postIds) {
    if (!supabase || postIds.length === 0) {
      setCommentsByPost({});
      return;
    }

    const { data, error: loadError } = await supabase
      .from(COMMENTS_TABLE)
      .select("id, post_id, nickname, message, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    if (loadError) {
      return;
    }

    const grouped = {};
    (data ?? []).forEach((comment) => {
      if (!grouped[comment.post_id]) {
        grouped[comment.post_id] = [];
      }
      grouped[comment.post_id].push(comment);
    });
    setCommentsByPost(grouped);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase || !message.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from(TABLE).insert({
      nickname: nickname.trim() || "익명",
      message: message.trim(),
    });

    if (insertError) {
      setError("의견 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      setMessage("");
      setError(null);
      await loadPosts();
    }
    setSubmitting(false);
  }

  function updateCommentDraft(postId, field, value) {
    setCommentDrafts((current) => ({
      ...current,
      [postId]: { ...current[postId], [field]: value },
    }));
  }

  async function handleCommentSubmit(event, postId) {
    event.preventDefault();
    const draft = commentDrafts[postId] || {};
    const draftMessage = (draft.message || "").trim();
    if (!supabase || !draftMessage || commentSubmittingId === postId) {
      return;
    }

    setCommentSubmittingId(postId);
    const { error: insertError } = await supabase.from(COMMENTS_TABLE).insert({
      post_id: postId,
      nickname: (draft.nickname || "").trim() || "익명",
      message: draftMessage,
    });

    if (!insertError) {
      setCommentDrafts((current) => ({ ...current, [postId]: { nickname: draft.nickname, message: "" } }));
      await loadComments(posts.map((post) => post.id));
    }
    setCommentSubmittingId(null);
  }

  function formatDate(value) {
    const date = new Date(value);
    return date.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="app app--board">
      <header className="app-header app-header--board">
        <div>
          <p className="page-kicker">FEEDBACK BOARD</p>
          <h1>게시판</h1>
          <p>사용해보신 분들의 후기와 의견을 자유롭게 남기고 확인할 수 있습니다.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onBack}>
          대문으로 돌아가기
        </button>
      </header>

      <div className="board-page">
        {!supabase ? (
          <div className="home-panel home-board-panel">
            <p className="home-board-title">사용 후기 게시판</p>
            <div className="home-board-notice">
              <p>
                게시판을 사용하려면 관리자가 Supabase 연결 정보(.env의 VITE_SUPABASE_URL,
                VITE_SUPABASE_ANON_KEY)를 설정해야 합니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="home-panel home-board-panel">
            <p className="home-board-title">사용 후기 게시판</p>
            <p className="home-board-subtitle">사용해보신 분들의 의견을 자유롭게 남겨주세요.</p>

            <form className="home-board-form" onSubmit={handleSubmit}>
              <input
                type="text"
                className="home-board-input home-board-input--name"
                placeholder="닉네임 (선택)"
                value={nickname}
                maxLength={20}
                onChange={(event) => setNickname(event.target.value)}
              />
              <textarea
                className="home-board-input home-board-input--message"
                placeholder="사용해보신 소감이나 개선 의견을 남겨주세요."
                value={message}
                maxLength={500}
                rows={3}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button type="submit" className="button" disabled={submitting || !message.trim()}>
                {submitting ? "등록 중…" : "의견 남기기"}
              </button>
            </form>

            {error ? <p className="home-board-error">{error}</p> : null}

            <div className="home-board-list">
              {loading ? (
                <p className="home-board-empty">불러오는 중…</p>
              ) : posts.length === 0 ? (
                <p className="home-board-empty">아직 등록된 의견이 없습니다. 첫 의견을 남겨보세요!</p>
              ) : (
                posts.map((post) => {
                  const comments = commentsByPost[post.id] || [];
                  const draft = commentDrafts[post.id] || {};

                  return (
                    <div className="home-board-item" key={post.id}>
                      <div className="home-board-item__head">
                        <strong>{post.nickname || "익명"}</strong>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                      <p>{post.message}</p>

                      {comments.length > 0 && (
                        <div className="board-comment-list">
                          {comments.map((comment) => (
                            <div className="board-comment-item" key={comment.id}>
                              <div className="board-comment-item__head">
                                <strong>{comment.nickname || "익명"}</strong>
                                <span>{formatDate(comment.created_at)}</span>
                              </div>
                              <p>{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        className="board-comment-form"
                        onSubmit={(event) => handleCommentSubmit(event, post.id)}
                      >
                        <input
                          type="text"
                          className="home-board-input board-comment-input--name"
                          placeholder="닉네임 (선택)"
                          value={draft.nickname || ""}
                          maxLength={20}
                          onChange={(event) => updateCommentDraft(post.id, "nickname", event.target.value)}
                        />
                        <input
                          type="text"
                          className="home-board-input board-comment-input--message"
                          placeholder="댓글을 남겨보세요."
                          value={draft.message || ""}
                          maxLength={300}
                          onChange={(event) => updateCommentDraft(post.id, "message", event.target.value)}
                        />
                        <button
                          type="submit"
                          className="ghost-button board-comment-submit"
                          disabled={commentSubmittingId === post.id || !(draft.message || "").trim()}
                        >
                          {commentSubmittingId === post.id ? "등록 중…" : "댓글"}
                        </button>
                      </form>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
