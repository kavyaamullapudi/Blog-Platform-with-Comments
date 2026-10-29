import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getStored = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

export default function App() {
  const [session, setSession] = useState(() => getStored("blogSession"));
  const [posts, setPosts] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [postForm, setPostForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => session?.token ? { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` } : { "Content-Type": "application/json" }, [session]);
  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }
  async function loadPosts() {
    try { setPosts(await request("/posts")); } catch (e) { setMessage(e.message); }
  }
  useEffect(() => { loadPosts(); }, []);
  async function openPost(id) {
    try { setActivePost(await request(`/posts/${id}`)); setMessage(""); }
    catch (e) { setMessage(e.message); }
  }
  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const data = await request(`/auth/${mode}`, { method: "POST", body: JSON.stringify(authForm) });
      setSession(data); localStorage.setItem("blogSession", JSON.stringify(data));
      setAuthForm({ name: "", email: "", password: "" }); setMessage(`Welcome, ${data.user.name}!`);
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem("blogSession"); setSession(null); setActivePost(null);
    setMessage("You have logged out.");
  }
  function startCreate() {
    if (!session) { setMessage("Please log in to create a post."); return; }
    setActivePost(null); setEditingId(null); setPostForm({ title: "", content: "" });
    document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" });
  }
  function startEdit(post) {
    setEditingId(post._id); setPostForm({ title: post.title, content: post.content }); setActivePost(null);
    document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" });
  }
  async function savePost(e) {
    e.preventDefault();
    try {
      const path = editingId ? `/posts/${editingId}` : "/posts";
      await request(path, { method: editingId ? "PUT" : "POST", body: JSON.stringify(postForm) });
      setMessage(editingId ? "Post updated successfully." : "Post published successfully.");
      setPostForm({ title: "", content: "" }); setEditingId(null); await loadPosts();
    } catch (e) { setMessage(e.message); }
  }
  async function deletePost(id) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try { await request(`/posts/${id}`, { method: "DELETE" }); setActivePost(null); setMessage("Post deleted."); await loadPosts(); }
    catch (e) { setMessage(e.message); }
  }
  async function addComment(e) {
    e.preventDefault();
    try {
      const post = await request(`/posts/${activePost._id}/comments`, { method: "POST", body: JSON.stringify({ text: commentText }) });
      setActivePost(post); setCommentText(""); setMessage("Comment added.");
    } catch (e) { setMessage(e.message); }
  }
  async function deleteComment(commentId) {
    try {
      const post = await request(`/posts/${activePost._id}/comments/${commentId}`, { method: "DELETE" });
      setActivePost(post); setMessage("Comment deleted.");
    } catch (e) { setMessage(e.message); }
  }

  const filteredPosts = posts.filter(p => `${p.title} ${p.content} ${p.authorName}`.toLowerCase().includes(search.toLowerCase()));
  const isMine = (post) => session?.user?.id === post?.author?.toString() || session?.user?.id === post?.author?._id || session?.user?.id === post?.author;

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setActivePost(null)}><span className="brand-mark">i</span> InkSpace</button>
      <nav><a href="#stories" onClick={() => setActivePost(null)}>Stories</a><a href="#editor" onClick={startCreate}>Write</a></nav>
      <div className="account">{session ? <><span className="welcome">Hi, {session.user.name}</span><button className="button button-light" onClick={logout}>Log out</button></> : <a className="button button-dark" href="#account">Sign in</a>}</div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">A HOME FOR YOUR IDEAS</p><h1>Stories worth<br/><em>sharing.</em></h1><p className="hero-sub">A quiet corner of the internet to write, read, and connect with curious minds.</p><a className="button button-dark" href="#editor" onClick={startCreate}>Start writing <span>↗</span></a></div>
        <div className="hero-art" aria-label="Decorative abstract illustration"><div className="sun"></div><div className="art-paper"><span>YOUR</span><strong>STORY</strong><small>starts here.</small></div><div className="art-orbit"></div><div className="art-dot">✳</div></div>
      </section>

      {message && <div className="notice" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

      <section className="content-grid">
        <div className="stories-section" id="stories">
          <div className="section-heading"><div><p className="eyebrow">THE COMMUNITY</p><h2>Latest stories</h2></div><span className="count">{posts.length} {posts.length === 1 ? "story" : "stories"}</span></div>
          <div className="search-wrap"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories or authors..." /></div>
          {filteredPosts.length === 0 ? <div className="empty"><div className="empty-icon">✎</div><h3>No stories yet</h3><p>{search ? "Try another search term." : "Be the first to share an idea with the community."}</p><button className="button button-dark" onClick={startCreate}>Write the first story</button></div> :
            <div className="post-list">{filteredPosts.map((post, index) => <article className="post-card" key={post._id}>
              <div className={`post-number number-${index % 3}`}>{String(index + 1).padStart(2, "0")}</div>
              <div className="post-info"><button className="post-title" onClick={() => openPost(post._id)}>{post.title}</button><p>{post.content.length > 180 ? `${post.content.slice(0, 180)}…` : post.content}</p><div className="post-meta"><span className="avatar">{post.authorName?.charAt(0)?.toUpperCase()}</span><span>{post.authorName}</span><span className="meta-dot">·</span><span>{new Date(post.createdAt).toLocaleDateString()}</span><button className="read-link" onClick={() => openPost(post._id)}>Read story ↗</button></div></div>
            </article>)}</div>}
        </div>

        <aside className="sidebar">
          <section className="side-card" id="account">
            <p className="eyebrow">{session ? "YOUR SPACE" : "JOIN THE COMMUNITY"}</p>
            {session ? <><h3>Keep your ideas flowing.</h3><p>You’re signed in. Share a new story or join the conversation.</p><button className="button button-dark full" onClick={startCreate}>Create a post <span>↗</span></button></> :
              <><h3>{mode === "login" ? "Welcome back." : "Create your account."}</h3><p>{mode === "login" ? "Sign in to write stories and leave comments." : "A few details and you’re ready to publish."}</p>
              <form onSubmit={submitAuth} className="form-stack">
                {mode === "register" && <label>Your name<input required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Alex Morgan" maxLength="60"/></label>}
                <label>Email address<input type="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com"/></label>
                <label>Password<input type="password" required minLength="6" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 6 characters"/></label>
                <button className="button button-dark full" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
              </form>
              <p className="switch-mode">{mode === "login" ? "New to InkSpace?" : "Already have an account?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Join now" : "Sign in"}</button></p></>}
          </section>
          <section className="quote-card"><div className="quote-mark">“</div><p>There is no greater agony than bearing an untold story inside you.</p><span>— MAYA ANGELOU</span><div className="quote-decoration">✳</div></section>
          <section className="mini-card"><span className="mini-icon">✦</span><div><strong>Good ideas grow here.</strong><p>Read with curiosity. Comment with kindness.</p></div></section>
        </aside>
      </section>

      <section className="editor-section" id="editor">
        <div className="editor-heading"><p className="eyebrow">PUT IT INTO WORDS</p><h2>{editingId ? "Edit your story" : "Have something to say?"}</h2><p>Every great story starts with a first draft.</p></div>
        <form className="editor-form" onSubmit={savePost}>
          <label>Story title<input required maxLength="160" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} placeholder="Give your story a title"/></label>
          <label>Your story<textarea required maxLength="20000" rows="7" value={postForm.content} onChange={e => setPostForm({ ...postForm, content: e.target.value })} placeholder="Start writing here..."/></label>
          <div className="editor-actions"><span>{postForm.content.length} / 20,000 characters</span><div>{editingId && <button type="button" className="button button-light" onClick={() => { setEditingId(null); setPostForm({ title: "", content: "" }); }}>Cancel</button>}<button className="button button-dark" disabled={!session}>{editingId ? "Save changes" : "Publish story"} <span>↗</span></button></div></div>
          {!session && <p className="form-hint">Sign in first to publish a story.</p>}
        </form>
      </section>

      {activePost && <div className="modal-backdrop" onClick={() => setActivePost(null)}><section className="post-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setActivePost(null)} aria-label="Close">×</button>
        <p className="eyebrow">A COMMUNITY STORY</p><h2>{activePost.title}</h2><div className="post-modal-meta">By {activePost.authorName} · {new Date(activePost.createdAt).toLocaleDateString()}</div><div className="full-story">{activePost.content}</div>
        {isMine(activePost) && <div className="owner-actions"><button className="button button-light" onClick={() => startEdit(activePost)}>Edit story</button><button className="button button-danger" onClick={() => deletePost(activePost._id)}>Delete story</button></div>}
        <div className="comments"><h3>Conversation <span>{activePost.comments?.length || 0}</span></h3>
          {activePost.comments?.length ? activePost.comments.map(comment => <div className="comment" key={comment._id}><div className="avatar">{comment.authorName?.charAt(0)?.toUpperCase()}</div><div className="comment-body"><strong>{comment.authorName}</strong><p>{comment.text}</p><small>{new Date(comment.createdAt).toLocaleDateString()}</small></div>{session?.user?.id === (comment.author?._id || comment.author)?.toString() && <button className="delete-comment" onClick={() => deleteComment(comment._id)}>Delete</button>}</div>) : <p className="no-comments">No comments yet. Start the conversation.</p>}
          <form className="comment-form" onSubmit={addComment}><textarea rows="3" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={session ? "Share a thoughtful comment..." : "Sign in to join the conversation"} disabled={!session} required maxLength="1000"/><button className="button button-dark" disabled={!session || !commentText.trim()}>Add comment ↗</button></form>
        </div>
      </section></div>}

    </main>
    <footer><button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span className="brand-mark">i</span> InkSpace</button><span>Made for curious minds.</span><span>© {new Date().getFullYear()} InkSpace</span></footer>
  </div>;
}
