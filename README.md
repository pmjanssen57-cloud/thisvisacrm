# THiS CRM v0.15.0 - Adviser Workspace Personalisation

This build adds the first controlled personalisation layer to the CRM while retaining the shared Turner Hopkins design system and workflows.

## Personal settings

Each mapped adviser can now save:

- Default landing page
- Standard or compact density
- Dashboard widget visibility, width and order
- Up to six personal quick actions
- Supporting information shown in Clients, Instructions and Agreements
- Saved filter/search views for Clients, Instructions and Agreements
- Client-list sort order within saved views

Preferences are stored against the adviser profile and therefore follow the adviser between devices.

## Deployment

Deploy the complete package and run the included migration:

`202608060002_add_adviser_workspace_preferences.sql`

Perform one hard refresh after deployment. All v0.14.9 functionality is retained.
