# THiS CRM v0.18.19

This release fixes the Netlify dependency installation failure. It pins image-size 2.1.0, includes yarn.lock and requires frozen installs. Read NETLIFY-BUILD-FIX-v0.18.19.txt before deployment.

Website Studio adds administrator-managed news drafts, previews, revision history and publishing to the private Turner Hopkins website mirror.

Based on GitHub v0.18.17, commit 4cb25bfb016a0d6bb823af615b47410b5a2cd9a8. Existing business workflows are retained. See RELEASE_NOTES-v0.18.18.txt for scope and WEBSITE-STUDIO-GUIDE.txt for setup and recovery.

Deploy through the existing Netlify source build: Node 20.19.0, yarn build, publish directory dist. Preserve netlify/, public/ and existing deployment settings. Four separate website tables initialize on first administrator use; an equivalent additive migration is included. No new Netlify environment variable is required.

Checks: yarn test:website, yarn validate:pwa and yarn build. Tests use isolated embedded PostgreSQL and do not access production records. The private Site has its own source, database and deployment.

After deployment, an administrator opens Website, connects the private mirror as its owner, then imports existing news. Saving drafts never publishes them. Public launch and domain migration are separate work.

