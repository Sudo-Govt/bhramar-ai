import { useState } from "react";
import {
  ArrowLeft, Search, Bell, MessageCircle, Users, BookOpen,
  Newspaper, Home, UserPlus, Image, FileText, ThumbsUp,
  MessageSquare, Share2, MoreHorizontal, Send, Hash,
  Briefcase, Globe, Lock, ChevronDown, X, Plus, Check,
  Scale, Star, Award, Video, Camera, Smile, MapPin,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ME = {
  id: "me",
  name: "Adv. Rahul Menon",
  title: "Senior Advocate · Kerala High Court",
  bar: "BCI #KL-2014-8821",
  location: "Kozhikode, Kerala",
  avatar: null,
  initials: "RM",
  connections: 312,
  posts: 47,
};

const FRIENDS = [
  { id: "f1", name: "Adv. Priya Nair", title: "Criminal Law · Thrissur", initials: "PN", online: true },
  { id: "f2", name: "Adv. Suresh Iyer", title: "Corporate Law · Kochi", initials: "SI", online: true },
  { id: "f3", name: "Adv. Deepa Varma", title: "Family Law · Trivandrum", initials: "DV", online: false },
  { id: "f4", name: "Adv. Arun Kumar", title: "IP Law · Ernakulam", initials: "AK", online: true },
  { id: "f5", name: "Adv. Nisha Pillai", title: "Labour Law · Palakkad", initials: "NP", online: false },
];

const SUGGESTIONS = [
  { id: "s1", name: "Adv. Vikram Bose", title: "Constitutional Law · Delhi HC", initials: "VB", mutual: 14 },
  { id: "s2", name: "Adv. Anitha George", title: "Cyber Law · Kochi", initials: "AG", mutual: 8 },
  { id: "s3", name: "Adv. Rajesh Sharma", title: "Tax Law · Mumbai HC", initials: "RS", mutual: 22 },
];

const GROUPS = [
  { id: "g1", name: "Kerala Bar Association", members: 4821, icon: "⚖️" },
  { id: "g2", name: "Criminal Defense Forum", members: 2103, icon: "🛡️" },
  { id: "g3", name: "IP & Tech Law Circle", members: 987, icon: "💡" },
  { id: "g4", name: "SC Advocates Network", members: 6540, icon: "🏛️" },
];

const PAGES = [
  { id: "p1", name: "Legal Aid India", followers: "32.4K", icon: "🤝" },
  { id: "p2", name: "Bar Council of Kerala", followers: "18.1K", icon: "📜" },
  { id: "p3", name: "Indian Law Review", followers: "9.8K", icon: "📰" },
];

type Post = {
  id: string;
  author: { name: string; title: string; initials: string; avatar?: string };
  time: string;
  content: string;
  image?: string;
  tag?: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
};

const INITIAL_POSTS: Post[] = [
  {
    id: "post1",
    author: { name: "Adv. Priya Nair", title: "Criminal Law · Thrissur", initials: "PN" },
    time: "2h ago",
    content: "Landmark judgment today — Sessions Court Thrissur granted bail citing unreasonable delay in investigation under Section 436A CrPC. Sharing the order summary for colleagues who handle similar matters. The court emphasised that 'liberty cannot be held hostage to procedural inaction.' 🏛️",
    tag: "CrPC",
    likes: 84,
    comments: 17,
    shares: 23,
    liked: false,
  },
  {
    id: "post2",
    author: { name: "Adv. Suresh Iyer", title: "Corporate Law · Kochi", initials: "SI" },
    time: "5h ago",
    content: "SEBI circular on insider trading disclosures — effective next month. Major implications for listed companies and their legal counsels. Has anyone drafted updated compliance SOPs for clients? Happy to share a template.",
    tag: "SEBI",
    likes: 61,
    comments: 9,
    shares: 31,
    liked: true,
  },
  {
    id: "post3",
    author: { name: "Indian Law Review", title: "Legal Publication · Page", initials: "IL" },
    time: "8h ago",
    content: "The Supreme Court's recent ruling on Article 21 and the right to digital access has far-reaching consequences. We break down the judgment in plain language. Read the full analysis on our platform.",
    tag: "SC Judgment",
    likes: 219,
    comments: 44,
    shares: 87,
    liked: false,
  },
  {
    id: "post4",
    author: { name: "Adv. Arun Kumar", title: "IP Law · Ernakulam", initials: "AK" },
    time: "1d ago",
    content: "Just helped a Kochi startup register their trademark after 3 years of objections. The key: a well-drafted counter-statement that distinguished their mark from existing registrations on the basis of phonetic dissimilarity and trade class. Never give up on a valid mark. 💪",
    tag: "IP Law",
    likes: 143,
    comments: 28,
    shares: 12,
    liked: false,
  },
];

type Chat = { id: string; from: string; text: string; mine: boolean };

// ─── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ initials, size = "md", online = false }: { initials: string; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const sz = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base", xl: "h-16 w-16 text-xl" }[size];
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center font-bold text-navy-deep`}>
        {initials}
      </div>
      {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-navy-deep" />}
    </div>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: (id: string) => void }) {
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={post.author.initials} size="md" />
          <div>
            <div className="font-semibold text-sm text-foreground">{post.author.name}</div>
            <div className="text-xs text-muted-foreground">{post.author.title} · {post.time}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.tag && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-gold/40 text-gold bg-gold/10 font-medium">
              {post.tag}
            </span>
          )}
          <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-foreground/90 leading-relaxed">{post.content}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-white/5">
        <span>{post.likes + (post.liked ? 1 : 0)} likes</span>
        <span>{post.comments} comments · {post.shares} shares</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium transition-all ${
            post.liked ? "text-gold bg-gold/10 hover:bg-gold/15" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button
          onClick={() => setCommenting(!commenting)}
          className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>

      {/* Comment box */}
      {commenting && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <Avatar initials={ME.initials} size="sm" />
          <div className="flex-1 flex items-center gap-2 bg-navy-deep/50 rounded-full px-3 py-1.5 border border-white/10">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button className="text-gold hover:text-gold-bright disabled:opacity-40" disabled={!comment.trim()}>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatDrawer({ friend, onClose }: { friend: typeof FRIENDS[0]; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Chat[]>([
    { id: "1", from: friend.id, text: "Hey! Did you see the new amendment to Section 138?", mine: false },
    { id: "2", from: "me", text: "Yes, just read it. Major implications for cheque bounce cases.", mine: true },
    { id: "3", from: friend.id, text: "Exactly. Want to collaborate on a brief? I have a client who was affected.", mine: false },
  ]);
  const [msg, setMsg] = useState("");

  const send = () => {
    if (!msg.trim()) return;
    setMsgs(m => [...m, { id: Date.now().toString(), from: "me", text: msg.trim(), mine: true }]);
    setMsg("");
  };

  return (
    <div className="fixed bottom-0 right-6 w-80 z-50 flex flex-col glass rounded-t-xl border border-white/10 shadow-2xl overflow-hidden"
      style={{ maxHeight: "420px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-navy-deep/60">
        <div className="flex items-center gap-2">
          <Avatar initials={friend.initials} size="sm" online={friend.online} />
          <div>
            <div className="text-xs font-semibold">{friend.name}</div>
            <div className="text-[10px] text-emerald-400">{friend.online ? "Online" : "Offline"}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: "280px" }}>
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
              m.mine ? "bg-gold text-navy-deep rounded-br-sm font-medium" : "bg-white/10 text-foreground rounded-bl-sm"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button onClick={send} className="text-gold hover:text-gold-bright disabled:opacity-40" disabled={!msg.trim()}>
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Social Page ──────────────────────────────────────────────────────────

export default function BhramarSocial({ onBack }: { onBack: () => void }) {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<"feed" | "network" | "groups" | "pages" | "news">("feed");
  const [postText, setPostText] = useState("");
  const [postPrivacy, setPostPrivacy] = useState<"public" | "connections">("connections");
  const [chatOpen, setChatOpen] = useState<typeof FRIENDS[0] | null>(null);
  const [friendStates, setFriendStates] = useState<Record<string, "none" | "pending" | "connected">>(
    Object.fromEntries(SUGGESTIONS.map(s => [s.id, "none"]))
  );
  const [notifications] = useState(5);

  const likePost = (id: string) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked } : p));
  };

  const submitPost = () => {
    if (!postText.trim()) return;
    const newPost: Post = {
      id: Date.now().toString(),
      author: { name: ME.name, title: ME.title, initials: ME.initials },
      time: "Just now",
      content: postText.trim(),
      likes: 0, comments: 0, shares: 0, liked: false,
    };
    setPosts(ps => [newPost, ...ps]);
    setPostText("");
  };

  const connectSuggestion = (id: string) => {
    setFriendStates(s => ({ ...s, [id]: s[id] === "none" ? "pending" : s[id] === "pending" ? "connected" : "none" }));
  };

  const navItems = [
    { id: "feed", icon: Home, label: "Feed" },
    { id: "network", icon: Users, label: "Network" },
    { id: "groups", icon: Hash, label: "Groups" },
    { id: "pages", icon: BookOpen, label: "Pages" },
    { id: "news", icon: Newspaper, label: "News" },
  ] as const;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="glass-strong border-b border-white/10 shrink-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 h-14">
          {/* Back + Logo */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <img src="/mainlogo.png" alt="Bhramar.ai" className="h-7 w-7 object-contain" />
            <span className="font-display font-bold text-base text-foreground">
              Bhramar<span className="text-gold">.ai</span>
              <span className="text-muted-foreground font-sans font-normal text-xs ml-1.5">/ Connect</span>
            </span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-xs hidden md:flex items-center gap-2 bg-navy-soft/60 rounded-full px-3 py-1.5 border border-white/10 ml-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              placeholder="Search advocates, communities…"
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>

          {/* Nav tabs */}
          <nav className="hidden lg:flex items-center gap-1 mx-auto">
            {navItems.map(n => (
              <button
                key={n.id}
                onClick={() => setActiveTab(n.id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg text-[10px] font-medium transition-all ${
                  activeTab === n.id
                    ? "text-gold bg-gold/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gold" />
            </button>
            <button className="relative p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <Avatar initials={ME.initials} size="sm" />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex lg:hidden border-t border-white/10">
          {navItems.map(n => (
            <button
              key={n.id}
              onClick={() => setActiveTab(n.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-all ${
                activeTab === n.id ? "text-gold border-b-2 border-gold" : "text-muted-foreground"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto h-full flex gap-4 px-4 py-4 overflow-hidden">

          {/* ── Left Sidebar ── */}
          <aside className="hidden lg:flex flex-col gap-3 w-64 shrink-0 overflow-y-auto">
            {/* My Profile card */}
            <div className="glass rounded-xl overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-navy-deep via-[hsl(270_90%_20%)] to-navy-deep relative">
                <div className="absolute inset-0 opacity-30"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 11px)" }} />
              </div>
              <div className="px-4 pb-4 -mt-6">
                <div className="flex items-end gap-3 mb-2">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center font-bold text-lg text-navy-deep border-2 border-background">
                    {ME.initials}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="text-sm font-semibold leading-tight">{ME.name}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{ME.title}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                  <Scale className="h-3 w-3" /> {ME.bar}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {ME.location}
                </div>
                <div className="mt-3 flex gap-4 text-center border-t border-white/10 pt-3">
                  <div className="flex-1">
                    <div className="text-gold font-bold text-sm">{ME.connections}</div>
                    <div className="text-[10px] text-muted-foreground">Connections</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gold font-bold text-sm">{ME.posts}</div>
                    <div className="text-[10px] text-muted-foreground">Posts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Groups */}
            <div className="glass rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Groups</span>
                <button className="text-gold hover:text-gold-bright"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              {GROUPS.slice(0, 3).map(g => (
                <button key={g.id} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                  <span className="text-base">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{g.name}</div>
                    <div className="text-[10px] text-muted-foreground">{g.members.toLocaleString()} members</div>
                  </div>
                </button>
              ))}
              <button className="w-full text-xs text-gold hover:text-gold-bright py-1.5 text-center">See all groups →</button>
            </div>

            {/* Pages */}
            <div className="glass rounded-xl p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Pages</div>
              {PAGES.map(p => (
                <button key={p.id} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                  <span className="text-base">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.followers} followers</div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Center Feed ── */}
          <main className="flex-1 min-w-0 overflow-y-auto space-y-3 pr-1">

            {activeTab === "feed" && (
              <>
                {/* Create post */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={ME.initials} size="md" />
                    <button
                      className="flex-1 text-left px-4 py-2.5 rounded-full bg-navy-deep/50 border border-white/10 text-sm text-muted-foreground hover:bg-navy-deep/80 hover:border-white/20 transition-all"
                      onClick={() => {}}
                    >
                      Share a legal insight, judgment, or update…
                    </button>
                  </div>

                  {/* Expanded composer */}
                  <div className="border-t border-white/10 pt-3">
                    <textarea
                      value={postText}
                      onChange={e => setPostText(e.target.value)}
                      placeholder="What's on your legal mind?"
                      rows={3}
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Image className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                          <FileText className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Video className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Hash className="h-4 w-4" />
                        </button>
                        {/* Privacy toggle */}
                        <button
                          onClick={() => setPostPrivacy(p => p === "public" ? "connections" : "public")}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-white/10 rounded-full px-2 py-1 ml-1"
                        >
                          {postPrivacy === "public" ? <Globe className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          {postPrivacy === "public" ? "Public" : "Connections"}
                        </button>
                      </div>
                      <button
                        onClick={submitPost}
                        disabled={!postText.trim()}
                        className="px-4 py-1.5 rounded-full bg-gold text-navy-deep text-xs font-bold hover:bg-gold-bright transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posts */}
                {posts.map(p => (
                  <PostCard key={p.id} post={p} onLike={likePost} />
                ))}
              </>
            )}

            {activeTab === "network" && (
              <div className="space-y-4">
                {/* People you may know */}
                <div className="glass rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-gold" /> People you may know
                  </h3>
                  <div className="grid gap-3">
                    {SUGGESTIONS.map(s => (
                      <div key={s.id} className="flex items-center gap-3">
                        <Avatar initials={s.initials} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.title}</div>
                          <div className="text-[10px] text-gold/80 mt-0.5">{s.mutual} mutual connections</div>
                        </div>
                        <button
                          onClick={() => connectSuggestion(s.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                            friendStates[s.id] === "none"
                              ? "border border-gold text-gold hover:bg-gold/10"
                              : friendStates[s.id] === "pending"
                              ? "bg-gold/20 text-gold border border-gold/40"
                              : "bg-gold text-navy-deep"
                          }`}
                        >
                          {friendStates[s.id] === "none" ? <><UserPlus className="h-3 w-3 inline mr-1" />Connect</> :
                           friendStates[s.id] === "pending" ? "Pending…" :
                           <><Check className="h-3 w-3 inline mr-1" />Connected</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your connections */}
                <div className="glass rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gold" /> Your connections ({ME.connections})
                  </h3>
                  <div className="grid gap-3">
                    {FRIENDS.map(f => (
                      <div key={f.id} className="flex items-center gap-3">
                        <Avatar initials={f.initials} size="md" online={f.online} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{f.title}</div>
                          {f.online && <div className="text-[10px] text-emerald-400">● Online now</div>}
                        </div>
                        <button
                          onClick={() => setChatOpen(f)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/20 text-muted-foreground hover:text-foreground hover:border-white/40 transition-all"
                        >
                          <MessageCircle className="h-3.5 w-3.5 inline mr-1" />Message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "groups" && (
              <div className="space-y-3">
                <div className="glass rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gold" /> Legal Communities
                  </h3>
                  <div className="grid gap-3">
                    {GROUPS.map(g => (
                      <div key={g.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="h-12 w-12 rounded-xl bg-navy-deep flex items-center justify-center text-2xl border border-white/10">
                          {g.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{g.name}</div>
                          <div className="text-xs text-muted-foreground">{g.members.toLocaleString()} members</div>
                        </div>
                        <button className="px-3 py-1.5 rounded-full text-xs font-medium border border-gold/40 text-gold hover:bg-gold/10 transition-all">
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pages" && (
              <div className="glass rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-gold" /> Official Pages
                </h3>
                {PAGES.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="h-12 w-12 rounded-xl bg-navy-deep flex items-center justify-center text-2xl border border-white/10">
                      {p.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.followers} followers</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-full text-xs font-medium border border-gold/40 text-gold hover:bg-gold/10 transition-all">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "news" && (
              <div className="space-y-3">
                {[
                  { title: "Supreme Court upholds right to digital privacy under Article 21", source: "LiveLaw", time: "1h ago", tag: "SC Judgment" },
                  { title: "BCI proposes mandatory CPD credits for practicing advocates from 2026", source: "Bar & Bench", time: "3h ago", tag: "Bar Council" },
                  { title: "Kerala HC: Land acquisition compensation must include consequential losses", source: "Indian Kanoon", time: "5h ago", tag: "Kerala HC" },
                  { title: "New amendment to IBC: Pre-packaged insolvency extended to MSME sector", source: "The Hindu", time: "8h ago", tag: "IBC" },
                  { title: "CBI courts get special jurisdiction for cybercrime cases over ₹5 crore", source: "Economic Times", time: "1d ago", tag: "Cyber Law" },
                ].map((n, i) => (
                  <div key={i} className="glass rounded-xl p-4 hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium leading-snug">{n.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{n.source} · {n.time}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-gold/30 text-gold bg-gold/10 shrink-0">
                        {n.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* ── Right Sidebar: Online Friends ── */}
          <aside className="hidden xl:flex flex-col gap-3 w-60 shrink-0 overflow-y-auto">
            {/* Contacts */}
            <div className="glass rounded-xl p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Online Now</div>
              <div className="space-y-1">
                {FRIENDS.filter(f => f.online).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setChatOpen(f)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <Avatar initials={f.initials} size="sm" online={f.online} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{f.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{f.title}</div>
                    </div>
                  </button>
                ))}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2 pb-1">Offline</div>
                {FRIENDS.filter(f => !f.online).map(f => (
                  <button
                    key={f.id}
                    onClick={() => setChatOpen(f)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left opacity-60"
                  >
                    <Avatar initials={f.initials} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{f.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested connections */}
            <div className="glass rounded-xl p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Suggestions</div>
              {SUGGESTIONS.slice(0, 2).map(s => (
                <div key={s.id} className="flex items-center gap-2 px-1 py-2">
                  <Avatar initials={s.initials} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">{s.mutual} mutual</div>
                  </div>
                  <button
                    onClick={() => connectSuggestion(s.id)}
                    className="text-gold hover:text-gold-bright transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Achievements */}
            <div className="glass rounded-xl p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Your Badges</div>
              <div className="flex flex-wrap gap-2 px-1">
                {[
                  { icon: "⚖️", label: "Top Contributor" },
                  { icon: "🏆", label: "Verified Bar" },
                  { icon: "📝", label: "50 Posts" },
                  { icon: "🤝", label: "300+ Network" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-1 rounded-full">
                    <span>{b.icon}</span> {b.label}
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* ── Chat Drawer ── */}
      {chatOpen && (
        <ChatDrawer friend={chatOpen} onClose={() => setChatOpen(null)} />
      )}
    </div>
  );
}
