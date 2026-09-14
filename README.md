# THiS CRM v0.17.20 - Agreement Email Routing Reliability

This release fixes Agreement Studio email routing for intake/client-linked agreements. Edited adviser details and party email addresses are now preserved and used at issue time instead of being rehydrated back to the original intake/client values.

The Issue Agreement dialog now shows the exact required-signatory To addresses and current adviser CC address before sending. The principal client email and principal signatory email stay synchronised in both directions.

No database migration is required. Existing 44 migration files are unchanged.
