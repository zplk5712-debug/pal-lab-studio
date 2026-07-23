import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const TABLE = "feedback";
const COMMENTS_TABLE = "comments";
const STORAGE_KEY = "feedback-board-posts";
const COMMENTS_STORAGE_KEY = "feedback-board-comments";

function getLocalPosts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalPosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    console.warn("Failed to save posts to localStorage");
  }
}

function getLocalComments() {
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalComments(comments) {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  } catch {
    console.warn("Failed to save comments to localStorage");
  }
}

export default function FeedbackBoard({ onBack }) {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(!!supabase);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentSubmittingId, setCommentSubmittingId] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    setError(null);

    if (supabase) {
      try {
        const { data, error: loadError } = await supabase
          .from(TABLE)
          .select("id, nickname, message, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (loadError) {
          throw new Error(loadError.message);
        }

        setPosts(data ?? []);
        saveLocalPosts(data ?? []);
        setIsOnline(true);
        await loadComments((data ?? []).map((post) => post.id));
        setLoading(false);
        return;
      } catch (err) {
        console.warn("Supabase load failed, falling back to localStorage:", err);
        setIsOnline(false);
      }
    }

    // Fallback to localStorage
    const localPosts = getLocalPosts();
    setPosts(localPosts);
    const localComments = getLocalComments();
    setCommentsByPost(localComments);
    setLoading(false);
  }

  async function loadComments(postIds) {
    if (postIds.length === 0) {
      setCommentsByPost({});
      return;
    }

    if (supabase) {
      try {
        const { data, error: loadError } = await supabase
          .from(COMMENTS_TABLE)
          .select("id, post_id, nickname, message, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true });

        if (loadError) {
          throw new Error(loadError.message);
        }

        const grouped = {};
        (data ?? []).forEach((comment) => {
          if (!grouped[comment.post_id]) {
            grouped[comment.post_id] = [];
          }
          grouped[comment.post_id].push(comment);
        });
        setCommentsByPost(grouped);
        saveLocalComments(grouped);
        return;
      } catch (err) {
        console.warn("Failed to load comments from Supabase:", err);
      }
    }

    // Fallback to localStorage
    const localComments = getLocalComments();
    setCommentsByPost(localComments);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim() || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const newPost = {
      id: `local-${Date.now()}`,
      nickname: nickname.trim() || "익명",
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error: insertError } = await supabase.from(TABLE).insert({
          nickname: newPost.nickname,
          message: newPost.message,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("");
        setNickname("");
        await loadPosts();
        setSubmitting(false);
        return;
      } catch (err) {
        console.warn("Failed to submit to Supabase, saving locally:", err);
      }
    }

    // Fallback: save to localStorage
    const localPosts = getLocalPosts();
    const updated = [newPost, ...localPosts];
    saveLocalPosts(updated);
    setPosts(updated);
    setMessage("");
    setNickname("");
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
    if (!draftMessage || commentSubmittingId === postId) {
      return;
    }

    setCommentSubmittingId(postId);

    const newComment = {
      id: `local-comment-${Date.now()}`,
      post_id: postId,
      nickname: (draft.nickname || "").trim() || "익명",
      message: draftMessage,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { error: insertError } = await supabase.from(COMMENTS_TABLE).insert({
          post_id: postId,
          nickname: newComment.nickname,
          message: newComment.message,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        setCommentDrafts((current) => ({ ...current, [postId]: { nickname: draft.nickname, message: "" } }));
        await loadComments(posts.map((post) => post.id));
        setCommentSubmittingId(null);
        return;
      } catch (err) {
        console.warn("Failed to submit comment to Supabase, saving locally:", err);
      }
    }

    // Fallback: save to localStorage
    const localComments = getLocalComments();
    if (!localComments[postId]) {
      localComments[postId] = [];
    }
    localComments[postId].push(newComment);
    saveLocalComments(localComments);
    setCommentsByPost(localComments);
    setCommentDrafts((current) => ({ ...current, [postId]: { nickname: draft.nickname, message: "" } }));
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
        {!supabase && posts.length === 0 ? (
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
