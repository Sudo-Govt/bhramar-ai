# Bhramar.ai Social Network — Integration Guide

## Files to create / modify

---

### 1. Add the page
Copy `BhramarSocial.tsx` → `src/pages/BhramarSocial.tsx`

---

### 2. Add a route in `src/App.tsx`

```tsx
import BhramarSocial from "./pages/BhramarSocial";

// Inside <Routes>:
<Route
  path="/connect"
  element={<ProtectedRoute><BhramarSocial onBack={() => navigate('/app')} /></ProtectedRoute>}
/>
```

Because BhramarSocial is a full-screen page, pass `onBack` as a prop.
The component calls `onBack()` when the user clicks the back arrow.

---

### 3. Add the Social icon button to Dashboard

In `src/pages/Dashboard.tsx`, find the top nav / sidebar area and add:

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// In the top-right icon cluster or sidebar:
<button
  onClick={() => navigate('/connect')}
  title="Bhramar Connect"
  className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
>
  <img src="/mainlogo.png" alt="Connect" className="h-6 w-6 object-contain" />
  {/* Optional notification dot */}
  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-gold animate-pulse" />
</button>
```

Put `/mainlogo.png` in your `public/` folder (rename your existing `public/mainlogo.png` if needed).

---

### 4. Supabase tables needed (run as a migration)

```sql
-- Social profiles (extends auth.users)
CREATE TABLE public.social_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  title TEXT,
  bar_number TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connections (friend requests)
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | blocked
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);

-- Posts (feed)
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'connections', -- public | connections
  tag TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reactions
CREATE TABLE public.post_reactions (
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  PRIMARY KEY(post_id, user_id)
);

-- Comments
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Direct messages
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Public profiles readable" ON public.social_profiles FOR SELECT USING (true);
CREATE POLICY "Own profile editable" ON public.social_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Posts readable by connections or public"
  ON public.social_posts FOR SELECT
  USING (privacy = 'public' OR user_id = auth.uid());

CREATE POLICY "Own posts"
  ON public.social_posts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "DMs: own messages"
  ON public.direct_messages FOR ALL
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
```

---

### 5. Enable Realtime for live chat

In Supabase dashboard → Table Editor → `direct_messages` → Enable Realtime.

Then in BhramarSocial.tsx `ChatDrawer`, subscribe:

```tsx
useEffect(() => {
  const channel = supabase
    .channel(`dm:${friend.id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `recipient_id=eq.${user.id}`,
    }, payload => {
      setMsgs(m => [...m, payload.new as Chat]);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [friend.id]);
```

---

### 6. Logo usage

The component already uses `/mainlogo.png` in the top nav:
```tsx
<img src="/mainlogo.png" alt="Bhramar.ai" className="h-7 w-7 object-contain" />
```
Make sure `public/mainlogo.png` exists. This same logo appears as the
entry point button in Dashboard and as the header of the social page.

---

## Feature phases

| Phase | Features | Effort |
|-------|----------|--------|
| MVP | Feed, basic profile, connect/disconnect | 1 week |
| v1.1 | Real-time chat, notifications | 3 days |
| v1.2 | Groups, community posts | 1 week |
| v1.3 | File/document sharing in posts | 3 days |
| v1.4 | Verified badge via Bar Council number | 2 days |
