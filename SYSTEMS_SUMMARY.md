# MIM Codebase Systems Summary

## (A) Followed Authors System - How Mods Are Fetched/Displayed

**Storage & Retrieval:**
- Primary: IndexedDB (`mimDB.setFollowedAuthor()`, `getAllFollowedAuthors()`)
- Backup: localStorage fallback with automatic migration
- Data: author name, icon URL, dateFollowed
- Status tracking: `modrinthStatus` cache maps `collection:projectId` → update availability

**Display Components:**
- `FomoFollowedAuthors.tsx` - main author list view
- `FollowedAuthorCard` - individual author card
- Tabs: projects, authors, history, showcases (subtab state in localStorage)
- Filter: "show only with updates" mode highlights mods needing upgrades

**Detection of New Mods:**
- **useAlertManager** periodically fetches `/api/modrinth/user/{author}/projects` (polls when sidebar open)
- Filters: published in last 30 days + not already in library
- Results shown in `newAuthorMods[]` alert items
- **useFomoBackgroundSync** runs 6-hour polling for new author mods (detects via newest date)
- Creates incidents and localStorage unread tracking

---

## (B) Alert System - How Alerts Are Created/Shown

**Core Architecture:**
- `incidentManager` - reactive incident factory with persistent storage
- Incidents: `{ id, title, detail, severity, module, status, seen }`
- State: active/resolved (unresolved shown in alerts)

**Creation Pathways:**
1. **Direct creation:** `incidentManager.createIncident({...})`
   - Deduplication: skips if same `id` already active
   - Emits `mim:incidents-updated` event with active incidents list

2. **Event-driven:**
   - `sage:crash-detected` → creates crash incident
   - `sage:security-risk` → creates security incident
   - `virustotal:scanning` / `virustotal:completed` → file scan alerts
   - `builder:validation-completed` → validation result alerts

3. **Config polling** (30-second when sidebar open):
   - Validates settings paths (source, builds, minecraft, downloads, staging)
   - Checks for missing API keys (VirusTotal, Modrinth)
   - Fetches crash logs and dependency validation

**UI Integration:**
- Alert manager tracks activeTab, activeProject, incidents list
- Listeners subscribe to: `mim:incidents-updated`, `active-project-changed`, `refresh-system`
- Auto-refresh on window focus + periodic polling
- Mark as seen via `incidentManager.markAsSeen()`

---

## (C) Showcases & Channels Management

**YouTube Showcase System:**
- **FomoYoutubeShowcase.tsx** - displays mods from latest YouTube video
- Mod resolution: queries `/api/modrinth/project` & `/api/curseforge/project` for each slug
- Caching: uses smart `cachedYoutubeShowcase` (stale-while-revalidate pattern)
- Structure: `YoutubeShowcaseEntry { title, videoUrl, videoId, modSlugs[], publishedAt }`

**Community Channels & Videos:**
- **FomoFollowedShowcases.tsx** - manages shared community videos
- Channel tracking: stored with usage counts via `/api/fomo/youtube-usage`
- Pagination: separate cursors for videos vs shorts
- Fetches: `/api/fomo/youtube-showcase?channel={url}&limit={n}`

**Video Card Component:**
- **ShowcaseVideoCard.tsx** - renders individual video with mod details
- Supports: expand/collapse, theme switching, floating player

---

## (D) Existing Update Mechanisms

**1. Event Bus (lib/events/eventBus.ts)**
   - Centralized pub/sub with type-safe event contract
   - Batch processing: groups events by type, flushes on requestAnimationFrame (~60fps)
   - Dual dispatch: both eventBus subscribers + CustomEvent (DOM compatibility)
   - **No WebSocket/SSE** - entirely polling-based

**2. Polling Systems:**

   **Alert Manager** (30 seconds when sidebar open):
   - Checks: config paths, API keys, crash logs, dependency issues
   - Trigger: sidebar open + window focus
   
   **Background Sync** (useFomoBackgroundSync - 6-hour interval):
   - Runs 5 seconds after app start, then every 6 hours
   - Checks: YouTube channels for new videos, authors for new mods
   - Creates incidents + localStorage unread tracking
   - State tracked: `lastVideoIds`, `lastModDates` per source
   
   **Staging Refresh** (30-second polling in useStaging)
   
**3. Local Storage Tracking:**
   - `mim_fomo_last_sync_state` - last seen video IDs & mod dates per author/channel
   - `mim_fomo_unread_authors` / `mim_fomo_unread_channels` - notification badges
   - `mim_seen_collection_versions` - version tracking for mod updates

**4. Custom Events (for immediate UI updates):**
   - `mim-followed-authors-changed` - author list modified
   - `mim-followed-mods-changed` - mod list modified
   - `mim-modrinth-status-changed` - update status changed
   - `fomo-unread-authors-updated` - new author mods badge
   - `fomo-unread-channels-updated` - new channel videos badge
   - Custom: `mim:${eventName}` from eventBus (for vanilla JS)

---

## Key Implementation Pattern for New Notifications

```typescript
// 1. Query API for new items
const latestItem = await fetch(`/api/...`).then(r => r.json());
const knownState = JSON.parse(localStorage.getItem("key") || "{}");

// 2. Detect change (compare IDs or dates)
if (knownState.lastId !== latestItem.id) {
  
  // 3. Create incident
  incidentManager.createIncident({
    id: `prefix-${latestItem.id}`,
    title: "New Item Available",
    detail: `Description of ${latestItem.title}`,
    severity: "info",
    module: "FOMO",
  });
  
  // 4. Dispatch custom event for immediate UI
  window.dispatchEvent(new CustomEvent("prefix-updated", { 
    detail: latestItem 
  }));
  
  // 5. Persist state
  localStorage.setItem("key", JSON.stringify({ lastId: latestItem.id }));
}
```

---

## Files to Reference When Implementing

- **Alert display:** [components/alerts/](components/alerts/)
- **FOMO Followed:** [components/fomo/followed/](components/fomo/followed/)
- **Showcases:** [components/fomo/showcase/](components/fomo/showcase/)
- **Hooks:** [hooks/useAlertManager.ts](hooks/useAlertManager.ts), [hooks/useFomoFollowedManager.ts](hooks/useFomoFollowedManager.ts), [hooks/fomo/useFomoBackgroundSync.ts](hooks/fomo/useFomoBackgroundSync.ts)
- **Event system:** [lib/events/](lib/events/)
- **Incidents:** [lib/intelligence/incidentManager.ts](lib/intelligence/incidentManager.ts)
- **Storage:** [lib/storage/indexeddb.ts](lib/storage/indexeddb.ts)
