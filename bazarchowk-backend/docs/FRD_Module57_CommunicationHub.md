# Frontend Requirements Document
# Module 57 — Communication Hub (BazarChowk)
# Version: 1.0 | Status: Production Ready

---

## 1. PURPOSE OF MODULE

The Communication Hub powers all real-time in-app messaging across the BazarChowk platform.
It enables direct, low-latency chat between:
- Customers ↔ Shop Owners (order queries, product questions)
- Customers ↔ Riders (delivery coordination, location sharing)
- Customers / Partners ↔ Support Agents (issue resolution)
- Super Admin → Any Role (broadcast announcements, system alerts)

**Transport:** Socket.IO WebSocket (namespace `/chat`) for real-time delivery.
**Fallback:** REST HTTP for message history load and offline send.
**Push:** Firebase FCM for background / offline users.

---

## 2. USER ROLES

| Role              | System Value       | Apps Used             |
|-------------------|--------------------|-----------------------|
| Customer          | `CUSTOMER`         | Customer Mobile App   |
| Rider             | `DELIVERY_PARTNER` | Rider Mobile App      |
| Shop Owner        | `SHOP_OWNER`       | Partner Dashboard Web |
| Farmer            | `FARMER`           | Partner Dashboard Web |
| Market Admin      | `MARKET_ADMIN`     | Admin Dashboard Web   |
| District Admin    | `DISTRICT_ADMIN`   | Admin Dashboard Web   |
| Super Admin       | `SUPER_ADMIN`      | Admin Dashboard Web   |

---

## 3. ACCESS MATRIX

| Action                       | Customer | Rider | Shop Owner | Farmer | Market Admin | District Admin | Super Admin |
|------------------------------|----------|-------|------------|--------|--------------|----------------|-------------|
| View own conversations       | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Create P2P conversation      | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Create SHOP_CUSTOMER chat    | ✅       | ❌    | ✅         | ❌     | ❌           | ❌             | ✅          |
| Create RIDER_CUSTOMER chat   | ✅       | ✅    | ❌         | ❌     | ❌           | ❌             | ✅          |
| Create SUPPORT chat          | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Send messages (participant)  | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Send attachments             | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Read own messages            | ✅       | ✅    | ✅         | ✅     | ✅           | ✅             | ✅          |
| Read others' messages        | ❌       | ❌    | ❌         | ❌     | ✅           | ✅             | ✅          |
| Send broadcast messages      | ❌       | ❌    | ❌         | ❌     | ❌           | ❌             | ✅          |
| View all conversations       | ❌       | ❌    | ❌         | ❌     | ✅           | ✅             | ✅          |
| Delete/archive conversation  | ❌       | ❌    | ❌         | ❌     | ✅           | ✅             | ✅          |

---

## 4. SCREENS REQUIRED

### Customer & Rider Mobile App (Expo React Native)
1. `ConversationListScreen` — List of all active chats
2. `ChatScreen` — Real-time message thread for one conversation
3. `NewConversationScreen` — Start a new chat (select user/type)
4. `AttachmentViewerScreen` — Full-screen image/audio viewer

### Partner Dashboard (Next.js — Shop Owner / Farmer)
5. `ShopInboxPage` — All customer conversations for this shop
6. `ShopChatPage` — Individual customer conversation thread
7. `BroadcastHistoryPage` — View received broadcast messages

### Admin Dashboard (Next.js — Market Admin / District Admin / Super Admin)
8. `AdminInboxPage` — View all conversations platform-wide
9. `AdminChatMonitorPage` — Read-only view of any conversation
10. `BroadcastComposePage` — Compose and send broadcast messages
11. `BroadcastHistoryAdminPage` — Full broadcast log with filters

---

## 5. SCREEN HIERARCHY

```
Root
├── Mobile (Customer / Rider)
│   ├── TabBar
│   │   └── ChatTab
│   │       ├── ConversationListScreen    [/chat]
│   │       │   └── ChatScreen            [/chat/:conversationId]
│   │       │       └── AttachmentViewerScreen [/chat/:id/attachment]
│   │       └── NewConversationScreen     [/chat/new]
│
├── Partner Dashboard (Web)
│   ├── Sidebar → Inbox
│   │   ├── ShopInboxPage               [/dashboard/inbox]
│   │   └── ShopChatPage                [/dashboard/inbox/:conversationId]
│
└── Admin Dashboard (Web)
    ├── Sidebar → Communications
    │   ├── AdminInboxPage              [/admin/communications]
    │   ├── AdminChatMonitorPage        [/admin/communications/:id]
    │   ├── BroadcastComposePage        [/admin/communications/broadcast]
    │   └── BroadcastHistoryAdminPage   [/admin/communications/broadcasts]
```

---

## 6. NAVIGATION FLOW

### Customer Opens Chat With Shop (from Order screen):
```
OrderDetailScreen
  → Tap "Chat with Shop" button
  → API: POST /communication/conversations {type: SHOP_CUSTOMER, participantIds: [shopOwnerId], orderId}
  → If conversation exists → reuse (backend deduplicates)
  → Navigate to ChatScreen with conversationId
  → Socket joins room conversation_${id}
  → Messages load via GET /communication/conversations/:id/messages
```

### Customer Opens Chat With Rider (from Delivery Tracking):
```
TrackingScreen
  → Tap "Chat with Rider" button
  → API: POST /communication/conversations {type: RIDER_CUSTOMER, participantIds: [riderId], orderId}
  → Navigate to ChatScreen
  → Socket joins room
```

### Admin Sends Broadcast:
```
AdminSidebar → Communications → Broadcast
  → BroadcastComposePage
  → Select targetRole + write content
  → POST /communication/broadcast
  → FCM delivers to all users of that role
  → Success toast shown
```

---

## 7. MOBILE SCREENS — DETAILED SPEC

### Screen 1: ConversationListScreen

**Route:** `/chat`
**Tab:** Chat (inbox icon)
**Purpose:** Show all conversations the user is part of, sorted by latest message.

**Layout:**
```
Header: "Messages"  [Search icon]  [Compose icon]
─────────────────────────────────────────────────
[SearchBar — hidden until search icon tapped]
─────────────────────────────────────────────────
FlatList of ConversationCard components
  - Avatar (other participant)
  - Name (other participant firstName + lastName)
  - Last message preview (50 chars max)
  - Timestamp (relative: "2m ago", "Yesterday")
  - Unread badge (red dot if lastReadAt < last message createdAt)
  - Conversation type chip: SHOP / RIDER / SUPPORT
─────────────────────────────────────────────────
FAB: [+] Compose new message
```

**Data Source:** `GET /communication/conversations`

**Empty State:**
> Icon: chat bubble outline
> Title: "No conversations yet"
> Subtitle: "Start a chat with a shop or contact support"
> Button: "Start a Chat" → NewConversationScreen

**Loading State:** 5× skeleton ConversationCard rows (shimmer animation)

**Error State:** 
> "Couldn't load messages. Tap to retry."
> Retry button triggers refetch

---

### Screen 2: ChatScreen

**Route:** `/chat/:conversationId`
**Purpose:** Real-time message thread. Primary interaction screen.

**Layout:**
```
Header:
  [Back]  [Avatar + Name + Online dot]  [Info icon]
─────────────────────────────────────────────────
MessageList (FlatList, inverted)
  MessageBubble (self — right, teal bg)
  MessageBubble (other — left, white bg, shadow)
  DateSeparator ("Today", "Yesterday", "June 17")
  SystemMessage (grey centered pill — "Order #1234 linked")
  TypingIndicator (animated 3-dot bubble)
─────────────────────────────────────────────────
InputBar:
  [Attachment icon]  [TextInput]  [Send button]
  (Send button active only when input.length > 0)
```

**Pagination:** Load 50 messages initially. On scroll-to-top, fetch page 2 (infinite scroll upward).

**Real-time:** Socket.IO `newMessage` event appends to bottom instantly.

**Read receipt:** Auto-called when screen mounts (getMessages API marks lastReadAt).

**Typing indicator:** Emit `typing` every keystroke (debounced 500ms). Show indicator when `userTyping` received.

**Message Types:**
- `TEXT` — plain text bubble
- `IMAGE` — thumbnail in bubble, tap → AttachmentViewerScreen
- `AUDIO` — waveform/play button (future)
- `SYSTEM` — centered grey pill text (e.g., "Order delivered")

**Empty State (no messages):**
> "Say hello! This is the beginning of your conversation."

**Error State (send failed):**
> Red "!" on message bubble + "Tap to retry" option

---

### Screen 3: NewConversationScreen

**Route:** `/chat/new`
**Purpose:** Initiate a new conversation

**Layout:**
```
Header: "New Message" [Cancel]
─────────────────────────────────
Type selector (horizontal chips):
  [Support] [Shop] [P2P]
─────────────────────────────────
If SUPPORT → auto-create, no extra input
If SHOP → SearchBar to search shops
If P2P → SearchBar to search users by name/phone
─────────────────────────────────
[Start Chat] button (disabled until selection made)
```

---

### Screen 4: AttachmentViewerScreen

**Route:** `/chat/:conversationId/attachment`
**Purpose:** Full screen image view

**Layout:**
```
[Close X]
Full-screen Image (pinch-to-zoom)
[Share button]  [Download button]
```

---

## 8. WEB DASHBOARD SCREENS — DETAILED SPEC

### Shop Owner — ShopInboxPage `/dashboard/inbox`

**Layout (2-column):**
```
Left Panel (300px):
  "Inbox" header + search bar
  Conversation list (same card design as mobile)
  Filters: All | Unread | Order-linked

Right Panel (flex):
  Default: "Select a conversation"
  When selected: Full chat thread (ShopChatPage embedded)
```

**Key difference from mobile:** No navigation — side-by-side panel layout.

---

### Admin — BroadcastComposePage `/admin/communications/broadcast`

**Layout:**
```
Page Title: "Send Broadcast Message"
──────────────────────────────────────
Form:
  Target Role *
    [Dropdown: CUSTOMER | DELIVERY_PARTNER | SHOP_OWNER | FARMER | ALL]
  
  Message Content *
    [Textarea — max 500 chars]
    Character counter: "245/500"
  
  Preview:
    [Phone mockup showing notification preview]
  
  [Send Broadcast] button
──────────────────────────────────────
Warning banner:
  "⚠️ This will send a push notification to ALL active [Role] users."
```

**Success State:** Toast "Broadcast sent to 1,247 users"

---
