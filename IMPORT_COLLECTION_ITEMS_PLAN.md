# Collection Items Import Wizard – Feature Plan

## 1. Objective
Enable workspace users to bulk-import items into any collection via a guided, two-step wizard. The importer must:
• Accept CSV exports from common sources (Webflow, Airtable, Google Sheets, etc.)
• Allow column-to-field mapping (including creating new fields on-the-fly)
• Support media ingestion for Image fields (download remote URLs → upload to Storage)
• Smart-convert HTML → Markdown when targeting a Markdown field
• Allow importing reference fields from Webflow which are CSV columns that contain slugs separated by semicolon (eg. 'slug-name-1; slug-name-2; slug-name-3') when the user maps to a reference field in their collection 
• Provide clear progress, validation, and error reporting

## 2. High-Level User Flow
1. **User opens a collection** → clicks **••• Import items** (available in the collection header bulk-actions menu *and* collection row ellipsis in the sidebar).
2. **Step 1 – Upload**: User selects a `.csv` file (drag & drop or browse). We parse headers client-side to preview columns.
3. **Step 2 – Map fields**:
   - Display table of CSV columns ↔ selectable collection fields (dropdown per column, styled like our existing field type select dropdown with icons).
   - Show field type and validation status.
   - *Add new field* button opens existing **Add Field** modal; on save, the new field is appended to the mapping dropdown list without requiring a page refresh.
   - Once all required fields are mapped (title + slug is required), **Import** becomes enabled.
4. **Processing**:
   - Upload file to server, create import job, stream progress.
   - Show progress bar & per-row success / error counts.
5. **Completion**: Summary screen with counts and optional *Download error CSV* for failed rows.

## 3. UI / UX Changes
- **Ellipsis Menus**
  - Add menu item `Import items` in:
    - `components/admin/CollectionHeader.tsx` (bulk actions)
    - `components/admin/AppSidebar.tsx` (collection list rows)
- **Modal Wizard**: Reuse existing `Dialog` + `Tabs` pattern.
  - `ImportItemsModal.tsx` (new component)
  - Internal Steps:
    1. `UploadStep.tsx`
    2. `MappingStep.tsx`
    3. (Optional) `ProgressStep.tsx` for realtime feedback
- **Field Mapping UI**
  - Table with columns: *CSV Column*, *Sample Value*, *Map To Field* (select), *Type Hint / Warning*
  - *Add new field* inline button next to dropdown.

## 4. Backend / API Design
| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/admin/content/{collection}/import` | `POST multipart/form-data` | Accepts CSV + JSON mapping; returns `importJobId` |
| `/api/admin/content/import/{jobId}` | `GET` (SSE) | Stream job progress & errors |

### Import Service Steps
1. Parse CSV (Papa Parse in Node stream mode).
2. For each row:
   - Build data payload according to mapping.
   - **Image fields**: download remote URLs → upload to Supabase Storage → replace with public path.
   - **Markdown fields**: detect HTML (`/<[^>]+>/`) → convert via `turndown`. 
   - Validate types & required fields.
   - Insert via existing content DAO (batched for performance).
3. Record success / failure, emit progress.

## 5. Data & Validation Rules
- **Required Fields**: Enforce at least title / slug.
- **Type Coercion**:
  - Text, Number, Boolean straightforward casts.
  - Dates parsed via `date-fns`.
- **Slug Uniqueness**: Check & auto-increment if duplicates.
- **Error Capture**: Collect row-level errors (validation, network, storage).

## 6. Libraries & Dependencies
| Purpose | Library | Notes |
| --- | --- | --- |
| CSV streaming | `papaparse` | Already used? else add |
| HTML → MD | `turndown` | Small, browser & server |
| Image fetch | native `fetch` / `node-fetch` | with timeout & size guard |
| Progress stream | SSE | reuse existing SSE util if available |

## 7. Edge Cases
- Large files → use streaming & row batching (configurable chunk size).
- Missing headers or duplicate column names.
- Invalid image URLs / large images.
- HTML larger than markdown field limit.
- Network failures on storage upload → retry with backoff.

## 8. Security & Performance
- **Auth**: Restrict endpoints to collection admins.
- **Rate Limit**: 2 concurrent import jobs per workspace.
- **File Size Cap**: 25 MB (config via env).
- Stream processing to avoid blocking the Node event loop.

## 9. Testing Strategy
1. **Unit**: CSV parser, HTML→MD conversion, image handler.
2. **Integration**: End-to-end import with fixture CSVs.
3. **UI**: Playwright tests covering wizard happy-path & validation errors.

## 10. Rollout Plan
1. Behind `importWizard` feature flag.
2. Internal testing on staging collections.
3. Beta release to selected users.
4. Collect feedback → iterate.

## 11. Timeline & Milestones
| Phase | Tasks | ETA |
| --- | --- | --- |
| 💡 Design | Finalize UX mocks, API contract | 2 days |
| 🔨 Implementation | Front-end wizard, backend service, storage utils | 5–7 days |
| ✅ QA | Automated tests, staging import stress test | 2 days |
| 🚀 Launch | Gradual rollout, docs update | 1 day |

*Total*: ~2 weeks including buffer.

## 12. Open Questions
1. Max CSV row limit? (currently unlimited with streaming)  
2. Should we support JSON imports in future scope?  

---
**Next steps**: Review & approve plan → create issue breakdown / task list → start development. 