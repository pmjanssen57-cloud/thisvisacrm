# THiS CRM v0.13.48 — Streamlined Client Record

This release is based on v0.13.47 and refines only the individual client record. The dashboard workload adviser scope and all other v0.13.47 behaviour are retained.

## Primary client-file navigation

The client workspace now presents the six sections used most often in a fixed order:

1. Overview
2. Actions
3. Documents
4. Stages
5. Key dates
6. Billing

Portal, Family and Notes & strategy remain available under an expandable **More sections** control. If one of those sections is opened directly, the group expands automatically.

Navigation cards use shorter summaries and only show badges where they convey a useful count, date or status.

## Overview refinement

The former large snapshot has been replaced by a compact next-action strip showing the current action, due date, main adviser, stage, document position and nearest key date.

The Overview page now contains four operational indicators:

- Current stage
- Next action due
- Next key date
- Documents outstanding

The client-details panel is read-only by default. It shows identity, contact, citizenship, address, adviser allocation and OneLaw information without presenting the user with a full data-entry form. **Edit client details** reveals the existing fields when changes are required.

Action log, timeline, print profile and SharePoint access remain available as compact file tools.

## Visual reduction

- Lighter borders and no card shadows in the client workspace
- Smaller navigation cards
- Less instructional text
- Fewer decorative status pills
- Saved-status bar hidden unless there is a change, update or validation message
- Responsive navigation retained for tablet and mobile

## Retained v0.13.47 changes

- Dashboard workload defaults to primary-adviser clients
- Optional dashboard backup-adviser toggle
- Recently viewed and Adviser load remain beside dashboard workload
- Needs attention and Critical dates dashboard cards remain removed
- Dashboard action filters default to Due today
- Contacted and searched intake forms can be viewed practice-wide
- Clients list defaults to primary-adviser matters with an optional backup toggle
- Medical certificate and Chest X-ray have separate document expiry dates
- The intake form captures current physical address

## Deployment

- No database migration
- No new npm dependency
- Existing Node and Yarn deployment configuration retained
- Commercial compliance suite and Employer Portal retained unchanged
