# THiS CRM v0.13.44 — Commercial Compliance Suite Build Fix

This release builds on v0.13.42 and completes the first practical compliance-management layer for commercial clients and their employer portal.

## Automated expiry reminders

Commercial clients can opt in to employer expiry reminders from the company record. A scheduled Netlify Function checks active commercial clients daily and sends tiered reminders for:

- Employer accreditation expiry
- Work visa expiry
- Approved Job Check expiry

The reminder tiers are 90, 60 and 30 days. Each tier is recorded in `commercial_reminder_log` so the same reminder is not repeatedly sent. A tier window is used so a missed scheduled run can be caught on the next day.

Recipients are the primary employer contact and active Company Admin portal users. The primary Turner Hopkins adviser is copied where an adviser email is available. The existing Microsoft Graph email environment variables are reused.

## Worker register import

Both the CRM and editable employer portal roles can download an Excel-compatible CSV template and import up to 500 work visa holder records at once.

The import:

- Supports worker, visa, passport, employment, pay and Job Check fields
- Skips duplicate rows using email, worker name and visa expiry
- Links a worker to an existing Job Check where the reference matches
- Marks employer-imported records for adviser review
- Reports rows that cannot be imported

Dates in the template use `YYYY-MM-DD`.

## Secure commercial document uploads

The commercial document register now supports direct uploads to the `commercial-documents` Netlify Blob store as well as approved external document links.

- Maximum direct upload size: 4 MB
- Accepted files: PDF, Word, Excel, CSV, JPG and PNG
- Every upload and download is authenticated
- Employer users can only access their own company and employer-visible documents
- Read-only portal users cannot upload or delete documents
- Deleted document entries remove the related Blob object
- Deleting a commercial client also removes its stored commercial documents
- The encrypted Backup Centre now includes the `commercial-documents` Blob store

## Compliance report

The CRM and Employer Portal can download a print-ready compliance report containing:

- Accreditation details
- Work visa holder register
- Approved Job Checks and position usage
- Compliance actions
- Document register

The downloaded HTML report can be opened in a browser and printed or saved as PDF.

## Job Check position tracking

Worker records now link directly to a Job Check ID while retaining the visible reference number.

- Position usage is calculated automatically from active and upcoming linked workers
- Job Checks automatically change between Active and Fully used
- Full Job Checks are unavailable for new worker links
- Server-side checks prevent active or upcoming workers from exceeding approved positions
- Existing linked workers remain editable
- Archiving a worker immediately releases the position
- Worker and Job Check lists show the linked relationship clearly

## Deployment

- Adds migration: `202607210003_add_commercial_compliance_suite.sql`
- Adds Netlify Function: `commercial-file.mjs`
- Adds scheduled Netlify Function: `commercial-reminders.mjs`
- Adds no npm dependency
- Keeps the existing Yarn and Node deployment configuration
