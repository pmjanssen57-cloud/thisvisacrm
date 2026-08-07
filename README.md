# THiS CRM v0.15.5 - Adviser-led Instructions Authoring

This build rebuilds the Skilled Migrant Category Instructions Studio around deliberate adviser drafting. It retains all v0.15.4 date, intake, live-chat, agreement, personalisation and CRM functionality.

## Adviser-led Road Map

The SMC Introduction and Road Map now uses five clear client-facing sections:

1. Your situation
2. The pathway we are considering
3. What needs to happen next
4. Documents to begin preparing
5. How we will work with you

The CRM supplies only administrative details such as the client name, broad matter type, adviser details and prepared date. The adviser must write the substantive case narrative. Assessment answers and CRM notes are not automatically converted into advice.

Each section includes a drafting prompt, character guidance and optional starter snippets. Snippets are inserted only when the adviser selects them and remain fully editable.

## Adviser-selected Documentation Guide

Evidence sections are disabled by default. The adviser selects the blocks that apply, writes client-specific guidance for each selected block, and deliberately chooses any police-clearance countries. Country instructions are then included beneath the adviser-authored police-clearance guidance.

The client-facing document uses a simpler structure without the repeated Confirmed requirement, Good evidence, Avoid, Format and Certification card framework. This keeps the advice readable while preserving useful evidence guidance where the adviser chooses to include it.

## Pre-issue control

The Studio checks that:

- all five Road Map sections contain substantive wording;
- no drafting prompts or unresolved placeholders remain;
- the Documentation Guide introduction is complete;
- at least one evidence section is deliberately selected;
- each selected section contains client-specific guidance;
- police-clearance countries are selected when that section is used; and
- the responsible adviser has reviewed and confirmed the final pack.

Printing and issue are blocked until the substantive content checks are complete. The final confirmation records that the pack reflects the adviser's advice rather than an automated CRM assessment.

## PDF flow

The SMC Road Map and Documentation Guide now render using controlled flowing pages. The revised page model avoids the blank pages, isolated headings and clipped content produced by the previous fixed-page layout. The cover design and THiS identity are retained.

## Template governance

The Template Library remains available for shared structure and standard drafting aids. A clear notice explains that the five SMC client narrative sections are draft-specific and must be completed by the adviser. Existing saved instruction records remain supported; the new guided content is stored inside the existing instruction Studio state.

## Deployment

Deploy the complete package and perform one hard refresh. No database migration, API, dependency or environment-variable change is required.
