# THiS CRM v0.15.12 - Netlify Efficiency Foundation

This release future-proofs the current CRM baseline against unnecessary Netlify Function compute and bandwidth as the practice database grows. It retains all v0.15.11 functionality.

## Incremental intake/contact refresh

The one-minute intake watcher no longer downloads every historical intake and questionnaire on each check. After the initial CRM load, the browser uses a server-issued refresh cursor and the API returns only intake/contact records whose `updated_at` value has changed since that cursor.

The explicit Refresh button still performs a full reconciliation when an adviser asks for one. The server captures each next cursor before running the query, which avoids missing a submission that arrives during an in-flight refresh.

Migration `202608110001_add_intake_updated_at_index.sql` adds an index supporting these delta queries. Runtime schema checks also create the index if required.

## Targeted save responses

Routine saves no longer rebuild and return the complete CRM dataset. The API returns only the record or collection affected by the operation and the React client merges that response into its existing state.

Targeted responses now cover the main day-to-day save paths including advisers and personal preferences, tasks, calendar entries, library records, intake records, Instructions Studio, Agreement Studio, email templates, seminars and feedback, consultation/booking records, and commercial-client records. Bulk booking availability and blocked-time updates return only their respective booking collection.

Full CRM reads remain available for initial load, explicit refresh/reconciliation and a smaller number of infrequent destructive/admin operations.

## Existing functionality retained

- Unified Client Record Editor.
- Live-chat Contact & Intake Handoff.
- Instructions Studio finished master Road Maps and modular Documentation Guides.
- Agreement signing visibility, captured signature display and accepted-agreement locking.
- Targeted agreement opening and lightweight agreement status refresh.
- Corrected Agreement PDF print flow.

No dependency or environment-variable changes.
