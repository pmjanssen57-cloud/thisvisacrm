# THiS CRM v0.13.57.1 — Integrated Agreement Studio

This release is based on the authoritative v0.13.56 Integrated Instructions Studio build and adds Agreement Studio while retaining all existing intake, print, commercial and portal functionality.

## Instructions Studio integration

- Open **Instructions** from the main CRM navigation to create client-linked or standalone instruction sets.
- Open a client record, expand **More sections**, then select **Instructions** to start from that client record.
- Client-linked drafts receive the applicant, recorded family, adviser, case type and strategy data already held in the CRM.
- CRM administrators can open the Template Library from inside the Studio. Template drafts and version history are stored in the database.
- Instruction sets are fixed saved snapshots; publishing a new master template does not silently alter earlier client drafts.

## Live intake refresh

While an authenticated CRM session is open, the app now checks for new intake and contact forms every 60 seconds. It also refreshes immediately when the browser tab or installed PWA returns to the foreground. New submissions update the dashboard and Enquiries & Intake counts without requiring a logout or restart.

The refresh is deliberately lightweight: it requests only intake/contact records rather than reloading the complete CRM. Open intake drafts are preserved. A manual **Refresh** control and last-checked time are also shown in the workspace.

## Request missing CV

Full intake records now show a CV-request action when the applicant CV, or an expected partner CV, has not been supplied. The action requires:

- A valid applicant email address.
- An assigned adviser.
- A valid email address on the assigned adviser record.

The message is sent through the existing Microsoft 365 shared mailbox, copied to the assigned adviser, and uses the assigned adviser as the reply-to address. The applicant can therefore reply directly with the document. Wording is editable under **Tools → Email templates → Assessment form - request missing CV**.

## Reliable intake print view

The intake print control now opens a stable printable page rather than triggering the print dialogue automatically before the document is fully ready. The adviser reviews the page and selects **Print / save PDF** from its toolbar. If a browser blocks the print window, the CRM downloads a printable HTML copy instead.

## Retained functionality

- Approved seminar-registration Excel-compatible export.
- Editable CRM email-template editor.
- Contact-form **Unable to assist** email action.
- Installable Android and desktop PWA.
- Streamlined six-section client record.
- Dashboard lead-adviser workload with optional backup matters.
- Practice-wide contacted and searched intake visibility.
- Separate Medical certificate and Chest X-ray documents.
- Physical address in the intake form.
- Commercial compliance suite and Employer Portal.

## Deployment

- Existing `yarn build` and `dist` deployment retained.
- New migration: `202608040002_add_agreement_studio.sql`.
- No new npm dependency.
- Service-worker cache and backup source version advanced to v0.13.57.1.


## Agreement Studio

- Create agreements directly from a client record or as standalone documents.
- Tailor application scope, professional fees, payment milestones, Government fees, signatories and matter-specific wording.
- Save and publish versioned master agreement templates without changing agreements already issued.
- Issue secure 30-day signing links through the existing Microsoft 365 mailbox, copying and routing replies to the assigned adviser.
- Capture required declarations, typed legal name, drawn signature, acceptance timestamp, IP address and user-agent audit information.
- Track Draft, Ready, Sent, Viewed, Partially signed, Accepted, Declined, Superseded, Cancelled and Archived statuses.
- Lock accepted agreements against editing or deletion.
- Retain the exact accepted Studio state and signatory audit record in the database.

The public acceptance page is served from `/agreement-studio.html?token=...`; only a SHA-256 hash of each secure token is stored in the database.
