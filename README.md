# THiS CRM v0.18.20

Website Studio imports now use an article picker: search, tick individual articles or select shown results, then import only that selection. Nothing is preselected. Existing drafts and articles with matching URLs are protected. You can return later to import more from the original 192-article snapshot.

Deploy the full extracted package through the existing GitHub/Netlify process and refresh the CRM. Preserve package.json, yarn.lock and netlify.toml at the repository root. No migration or reconnection is required; the existing website connection and publishing workflow are retained.

See RELEASE_NOTES-v0.18.20.txt, WEBSITE-STUDIO-GUIDE.txt and VALIDATION.txt. Node 20.19.0 and Yarn 1.22.22 are retained, including the v0.18.19 dependency fix and unchanged lockfile.
