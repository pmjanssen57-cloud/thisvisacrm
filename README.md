# THiS CRM v0.15.1 - Adviser Live Chat Quick Replies

This build adds a shared quick-reply library to the adviser side of native live chat while retaining the v0.15.0 adviser workspace personalisation release and all earlier CRM functionality.

## Adviser quick replies

After an adviser claims a website conversation, the Reply composer now includes a **Quick replies** control. Selecting a reply inserts it into the composer for review and editing. It is never sent automatically.

The initial shared library includes:

- A welcoming introduction
- An invitation to complete the full immigration assessment form
- Direct email details for immigration@turnerhopkins.co.nz
- The Turner Hopkins office phone number
- A request for the visitor's current visa, expiry date and intended outcome
- A response explaining that a question needs fuller assessment
- A short "reviewing now" holding response
- A friendly closing response

Quick replies can use the visitor's first name, full name and assigned adviser name automatically.

## Administration

Administrators can edit the shared library under:

`Tools > Live chat settings > Adviser quick replies`

Replies can be added, removed, renamed, reordered through the listed sequence, or restored to the THiS defaults. A maximum of 20 shared replies is supported.

Available fields are:

- `{{first_name}}`
- `{{visitor_name}}`
- `{{adviser_name}}`
- `{{assessment_url}}`
- `{{email}}`
- `{{phone}}`

## Deployment

Deploy the complete package and run the new migration:

`202608070001_add_live_chat_quick_replies.sql`

The live-chat function also adds the column defensively when it first runs. Perform one hard refresh after deployment.

All v0.15.0 adviser personalisation, CRM, intake, booking, portal, Instructions Studio, Agreement Studio, email, signing and native live-chat functionality is retained.
