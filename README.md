# THiS CRM v0.15.4 - Instructions Date and At-a-Glance Editor

This build corrects Instructions Studio document dates and makes the Application at a glance page practical for adviser use, while retaining the v0.15.3 intake print and adviser-email improvements.

## Instructions date handling

New instruction sets now use the Pacific/Auckland calendar date rather than the UTC date. Existing drafts created across the UTC/New Zealand date boundary are corrected when the instruction record is loaded. Manually selected prepared dates remain supported.

## Application at a glance

The client-data tab now includes a draft-specific editor for the application, guide, strategy, included applicants, important date and adviser values. These fields can also be changed directly in the preview while Edit text is active. A restore control returns the values to the linked CRM data.

The client-facing page now uses a compact two-column structure, with long strategy and adviser content placed in full-width rows so lengthy case notes wrap cleanly without producing narrow, oversized cards.

## Intake printing

The intake action is now labelled **Print / save PDF**. It opens a same-origin print window, waits for the logo and fonts, and calls the browser print dialogue automatically. The print-window buttons are wired with JavaScript event listeners so they continue to work under the CRM Content Security Policy.

If the browser blocks the print window, the CRM downloads a printable HTML copy and explains how to print it using the browser command.

## Email results to adviser

A new **Email results to adviser** button appears in the intake record support actions. It is available once an adviser with a valid email address has been assigned.

The email includes:

- Current CRM status and review fields
- Recommended pathway and consultation outcome
- Adviser assessment notes
- Review flags
- The questionnaire answers in the same section order as the intake form

The server resolves the recipient from the assigned adviser record, sends the message through the existing Microsoft 365 shared mailbox, and records it in the CRM email log.

The wording and presentation can be maintained under **Tools > Email templates > Assessment form - email results to adviser**.

## Deployment

Deploy the complete package and perform one hard refresh. No database migration, dependency or environment-variable change is required. All v0.15.2 live-chat schedule fixes, v0.15.1 quick replies, v0.15.0 adviser personalisation and earlier CRM functionality are retained.
