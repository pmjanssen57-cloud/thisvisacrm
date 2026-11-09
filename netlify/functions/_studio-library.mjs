import { randomUUID } from 'node:crypto';

// Dedicated rows in the existing library tables. Personal rows never enter the
// shared bootstrap/cache response; the owner comes only from resolved identity.
export async function studioLibrary(database, access, body, actor = '') {
  if (!['instructions', 'agreement'].includes(body.studio)) throw new Error('Choose a valid Studio.');
  const table = body.studio === 'instructions' ? 'instruction_template_library' : 'agreement_template_library';
  const personalId = access.adviserId ? `blocks83-personal:${access.adviserId}` : '';
  const empty = () => ({ revision: '', items: [], masters: {} });
  const read = async id => {
    const rows = table === 'instruction_template_library'
      ? await database.sql`SELECT library_json FROM instruction_template_library WHERE id = ${id} LIMIT 1`
      : await database.sql`SELECT library_json FROM agreement_template_library WHERE id = ${id} LIMIT 1`;
    return rows[0]?.library_json || empty();
  };
  if (body.operation === 'read') return { team: await read('blocks83-team'), personal: personalId ? await read(personalId) : empty(), canSavePersonal: Boolean(personalId), canManageTeam: access.role === 'Admin' };
  if (body.operation !== 'save' || !['team', 'personal'].includes(body.scope)) throw new Error('Invalid library request.');
  if (body.scope === 'team' && access.role !== 'Admin') throw new Error('Only administrators can change team blocks and master templates.');
  if (body.scope === 'personal' && !personalId) throw new Error('Link your login to an adviser before saving personal blocks.');
  const value = body.library;
  if (!value || !Array.isArray(value.items) || value.items.length > 100 || !value.masters || Array.isArray(value.masters) || typeof value.masters !== 'object') throw new Error('Invalid library content.');
  if (value.items.some(x => !x || !/^[\w-]{1,100}$/.test(x.id || '') || typeof x.title !== 'string' || !x.title.trim() || x.title.length > 160 || typeof x.html !== 'string')) throw new Error('Every block needs a valid identifier, title and content.');
  if (new Set(value.items.map(x => x.id)).size !== value.items.length) throw new Error('Duplicate block identifiers.');
  if (body.scope === 'personal' && Object.keys(value.masters).length) throw new Error('Master templates belong in the team library.');
  for (const [key, entry] of Object.entries(value.masters)) {
    if (!/^[\w-]{1,80}$/.test(key) || !entry || !Array.isArray(entry.versions) || entry.versions.length > 20) throw new Error('Invalid master history.');
  }
  const library = { items: value.items, masters: value.masters, revision: randomUUID(), updatedAt: new Date().toISOString() };
  const encoded = JSON.stringify(library);
  if (Buffer.byteLength(encoded) > 2500000) throw new Error('Library is too large. Remove unused blocks or older drafts first.');
  const id = body.scope === 'team' ? 'blocks83-team' : personalId;
  const expected = String(body.revision || '');
  let rows;
  // Atomic compare-and-swap prevents one editor silently replacing another.
  if (table === 'instruction_template_library') {
    rows = await database.sql`INSERT INTO instruction_template_library (id, library_json, updated_by, updated_at)
      SELECT ${id}, ${encoded}::jsonb, ${actor}, NOW() WHERE ${expected} = ''
      ON CONFLICT (id) DO UPDATE SET library_json = EXCLUDED.library_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      WHERE COALESCE(instruction_template_library.library_json->>'revision', '') = ${expected}
      RETURNING library_json`;
    // An INSERT SELECT with a false predicate cannot reach ON CONFLICT.
    if (expected) rows = await database.sql`UPDATE instruction_template_library SET library_json = ${encoded}::jsonb, updated_by = ${actor}, updated_at = NOW()
      WHERE id = ${id} AND library_json->>'revision' = ${expected} RETURNING library_json`;
  } else {
    rows = await database.sql`INSERT INTO agreement_template_library (id, library_json, updated_by, updated_at)
      SELECT ${id}, ${encoded}::jsonb, ${actor}, NOW() WHERE ${expected} = ''
      ON CONFLICT (id) DO UPDATE SET library_json = EXCLUDED.library_json, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      WHERE COALESCE(agreement_template_library.library_json->>'revision', '') = ${expected}
      RETURNING library_json`;
    if (expected) rows = await database.sql`UPDATE agreement_template_library SET library_json = ${encoded}::jsonb, updated_by = ${actor}, updated_at = NOW()
      WHERE id = ${id} AND library_json->>'revision' = ${expected} RETURNING library_json`;
  }
  if (!rows.length) throw new Error('This library changed in another session. Your edits are still open. Copy any text you need, then reload the library before saving.');
  return { scope: body.scope, library: rows[0].library_json };
}
