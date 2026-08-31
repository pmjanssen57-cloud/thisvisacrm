# THiS CRM v0.17.1 - Matter Workspace + Notification Recipients

This release is built directly from **v0.17.0 Matter Workspace** and is intended to be deployed instead of v0.17.0.

## Configurable internal notification recipients

Administrators can now manage website-notification recipients from **Admin / Adviser profiles**. The new **Who receives website alerts?** panel appears above the adviser profiles and allows different recipient groups for:

- Assessment form submissions
- Contact form submissions
- Seminar registrations
- Client feedback submissions
- SMC calculator internal alerts

Each notification type can have multiple advisers. Additional non-adviser/team email addresses can also be entered if required.

Inactive advisers are automatically excluded from delivery, so a departing staff member can be deactivated without continuing to receive alerts. When a replacement staff member is added as an adviser, an Admin can select them in the relevant notification groups and save — no code or Netlify environment-variable change is required.

A convenience action copies the Assessment-form recipients across all notification types when the same team should receive everything.

Live-chat notifications remain under **Live Chat settings**, because live chat already has its own notification controls.

## Existing defaults and safe transition

Until an Admin saves the new settings, v0.17.1 preserves the existing notification behaviour. This prevents a deployment from silently changing who receives alerts. Once saved, the database settings become authoritative and the old hard-coded/environment fallbacks are no longer used for that notification type.

## Matter Workspace and retained functionality

All v0.17.0 Matter Workspace functionality remains in place, including My Work, the client Matter Command Centre, Stage / Matter Status / Next Action separation, Update File workflow, portal wording library and full-record access.

The release also retains enquiry archiving/CV cleanup, unassigned-client recovery, adviser-before-conversion protection, Agreement Studio A4 print fixes and assessment-form email/CV reliability.

## Database

v0.17.1 adds one non-destructive table, `notification_recipient_settings`, through migration `202608310002_add_notification_recipient_settings.sql`.

No historical migration has been edited. The existing v0.17.0 Matter Workspace migration remains unchanged.

## Rollback

Redeploy **THiS CRM v0.17.0 Matter Workspace** to roll the application back. The additional notification-settings table can safely remain in the database; v0.17.0 will ignore it.
