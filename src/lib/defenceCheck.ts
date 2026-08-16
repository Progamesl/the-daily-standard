/**
 * Try to break into the site, from the site, and report what held.
 *
 * Every other security screen in this admin used to *assert* things — a green
 * badge saying protection was on, read from a setting nobody enforced. This
 * asks the database the same questions an outsider would, using the public key
 * that ships in every reader's browser, and reports what actually came back.
 *
 * A green result here is evidence. A red one is a door standing open.
 *
 * Nothing here damages anything: the write probes use a clearly-marked canary
 * row and delete it again, and if a write unexpectedly succeeds that success IS
 * the finding, so it is reported loudly and cleaned up.
 */

import { supabase } from './supabaseClient';

export type CheckStatus = 'pass' | 'fail' | 'skipped';

export interface CheckResult {
  id: string;
  /** What was attempted, in the words of the person trying it. */
  attempt: string;
  /** What should happen. */
  expectation: string;
  status: CheckStatus;
  /** What actually happened. */
  detail: string;
  /** Why an editor should care, when it failed. */
  consequence?: string;
}

const CANARY = 'security-check-canary-delete-me';

/** A fetch with the anonymous key only — no staff session attached. */
async function asStranger(path: string, init?: RequestInit): Promise<Response | null> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  try {
    return await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch {
    return null;
  }
}

/** Remove anything a probe managed to create, using the signed-in session. */
async function cleanUp(table: string, column: string, value: string) {
  try {
    await supabase?.from(table).delete().eq(column, value);
  } catch { /* best effort — the finding is what matters */ }
}

export async function runDefenceCheck(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const add = (r: CheckResult) => results.push(r);

  const unavailable = (id: string, attempt: string, expectation: string): CheckResult => ({
    id, attempt, expectation, status: 'skipped',
    detail: 'Could not reach the database to try this.',
  });

  // 1. Can a stranger read stories that are not published?
  {
    const res = await asStranger('articles?select=id,headline&status=neq.published&limit=5');
    if (!res) add(unavailable('drafts', 'Read stories that have not been published', 'Refused'));
    else {
      const rows = res.ok ? await res.json().catch(() => []) : [];
      const leaked = Array.isArray(rows) ? rows.length : 0;
      add({
        id: 'drafts',
        attempt: 'Read stories that have not been published',
        expectation: 'Refused',
        status: leaked === 0 ? 'pass' : 'fail',
        detail: leaked === 0
          ? 'Nothing came back — unpublished work is not visible from outside.'
          : `${leaked} unpublished ${leaked === 1 ? 'story was' : 'stories were'} returned.`,
        consequence: leaked > 0
          ? 'Anyone could read stories before you publish them, including ones you decided not to run.'
          : undefined,
      });
    }
  }

  // 2. Can a stranger read the staff list?
  {
    const res = await asStranger('admin_users?select=email,role&limit=5');
    if (!res) add(unavailable('roster', 'Read the list of staff accounts', 'Refused'));
    else {
      const rows = res.ok ? await res.json().catch(() => []) : [];
      const leaked = Array.isArray(rows) ? rows.length : 0;
      add({
        id: 'roster',
        attempt: 'Read the list of staff accounts',
        expectation: 'Refused',
        status: leaked === 0 ? 'pass' : 'fail',
        detail: leaked === 0
          ? 'Nothing came back — the roster is not readable from outside.'
          : `${leaked} staff ${leaked === 1 ? 'record was' : 'records were'} returned, including email addresses.`,
        consequence: leaked > 0
          ? 'An outsider would have a list of exactly whose passwords to guess at.'
          : undefined,
      });
    }
  }

  // 3. Can a stranger publish a story?
  {
    const res = await asStranger('articles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: CANARY, slug: CANARY, headline: 'Security check — delete me',
        body: 'x', section: 'us', author_id: 'check', author_name: 'check',
        status: 'published',
      }),
    });
    if (!res) add(unavailable('write', 'Add a story to the site', 'Refused'));
    else {
      const wrote = res.ok;
      if (wrote) await cleanUp('articles', 'id', CANARY);
      add({
        id: 'write',
        attempt: 'Add a story to the site',
        expectation: 'Refused',
        status: wrote ? 'fail' : 'pass',
        detail: wrote
          ? 'The story was created. It has been removed again.'
          : `Refused (${res.status}) — only signed-in staff can write stories.`,
        consequence: wrote
          ? 'Anyone at all could publish onto the front page, or quietly rewrite a story that is already there.'
          : undefined,
      });
    }
  }

  // 4. Can a stranger create themselves a staff account?
  {
    const res = await asStranger('admin_users', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: CANARY, username: CANARY, password_hash: 'x',
        display_name: 'Security check', email: `${CANARY}@example.invalid`,
        role: 'super_admin', active: true,
      }),
    });
    if (!res) add(unavailable('account', 'Give themselves a staff account', 'Refused'));
    else {
      const wrote = res.ok;
      if (wrote) await cleanUp('admin_users', 'id', CANARY);
      add({
        id: 'account',
        attempt: 'Give themselves a staff account',
        expectation: 'Refused',
        status: wrote ? 'fail' : 'pass',
        detail: wrote
          ? 'The account was created. It has been removed again.'
          : `Refused (${res.status}) — accounts can only be made by an editor-in-chief.`,
        consequence: wrote
          ? 'Anyone could make themselves an editor and take over the whole site.'
          : undefined,
      });
    }
  }

  // 5. Can a stranger read who has been signing in?
  {
    const res = await asStranger('login_attempts?select=username&limit=5');
    if (!res) add(unavailable('signins', 'Read the sign-in history', 'Refused'));
    else {
      const rows = res.ok ? await res.json().catch(() => []) : [];
      const leaked = Array.isArray(rows) ? rows.length : 0;
      add({
        id: 'signins',
        attempt: 'Read the sign-in history',
        expectation: 'Refused',
        status: leaked === 0 ? 'pass' : 'fail',
        detail: leaked === 0
          ? 'Nothing came back — sign-in records stay inside the newsroom.'
          : `${leaked} sign-in ${leaked === 1 ? 'record was' : 'records were'} returned.`,
        consequence: leaked > 0
          ? 'An outsider could see who signed in, when, and from where.'
          : undefined,
      });
    }
  }

  // 6. The site still has to work for readers. A lockdown that breaks the
  //    paper is not a win, so this one is expected to succeed.
  {
    const res = await asStranger('articles?select=id&status=eq.published&limit=1');
    if (!res) add(unavailable('readers', 'Read a published story, as any visitor would', 'Allowed'));
    else {
      const rows = res.ok ? await res.json().catch(() => []) : [];
      const ok = Array.isArray(rows) && rows.length > 0;
      add({
        id: 'readers',
        attempt: 'Read a published story, as any visitor would',
        expectation: 'Allowed',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? 'Published stories are readable — the paper works for its readers.'
          : 'Published stories could not be read. The site may be broken for everyone.',
        consequence: ok ? undefined : 'Readers may be seeing an empty site.',
      });
    }
  }

  return results;
}
