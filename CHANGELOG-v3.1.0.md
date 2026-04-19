# 📝 CHANGELOG — v3.1.0 (Released: April 20, 2026)

**Frontend Release Notes** — See main repo (pustaka-filsafat-api) for full changelog.

## What's New in Frontend

### 🎨 Mobile & Dark Theme
- Full dark theme consistency across all pages (PublicCatalog, Dashboard, Loans, etc.)
- Persistent theme toggle in mobile navbar
- "Back to Catalog" link in mobile admin menu

### 🏷️ Multi-Tag System  
- Typed hashtag input in book form (#tag syntax)
- Hashtag display in catalogs with semantic grouping (Bentuk/Konten/Lainnya)
- Tag filtering in search

### 📦 Stock Split UI
- New "Split Posisi Editor" for books with qty > 1
- Multi-row allocation with per-position quantity inputs
- Total quantity validation (must match book qty)

### 👁️ Loan Visibility
- "Ketersediaan per Posisi" display in borrow modal
- Shows available quantity at each shelf location
- Real-time availability calculation

### 💅 Styling Improvements
- Category sidebar contrast improvements (better readability)
- Consistent hover/active states
- Responsive layout on all breakpoints

## Files Changed

```
src/pages/
  ├─ PublicCatalog.vue     (+200 lines) — Theme, borrow flow, tags, availability
  ├─ UpdatePosisi.vue      (+150 lines) — Split editor UI
  ├─ BookForm.vue          (+80 lines) — Hashtag chip input
  ├─ Dashboard.vue         (-20 lines) — Cleanup redundant blocks
  └─ ActivityLogs.vue      (+20 lines) — Timestamp consistency

src/components/
  └─ Navbar.vue            (+30 lines) — Theme toggle, catalog link

src/api/
  └─ index.js              (+5 lines) — New API helpers

src/style/
  └─ bauhaus.css           (+50 lines) — Token remapping
```

## Build Info
- **Bundle Size**: 273 KB JS + 74 KB CSS (gzip)
- **Build Time**: ~2 seconds
- **Modules**: 120 modules transformed
- **No Breaking Changes**: 100% backward compatible

---

See CHANGELOG-v3.1.0.md in main API repo for comprehensive details on all phases.
