import "server-only";

import { RequestError } from "./http.server";
import { createZernioClient, type LinkedInSave } from "./zernio";

function localClient() {
  const key = process.env.ZERNIO_API_KEY;
  if (!key) return;
  return createZernioClient(key, {
    linkedInId: process.env.LAUNCH_NOTES_LINKEDIN_ACCOUNT_ID,
    mailId: process.env.LAUNCH_NOTES_MAIL_ACCOUNT_ID,
  });
}

export async function connections() {
  return localClient()?.connections() ?? { configured: false, linkedin: [], mail: [] };
}

export async function saveLinkedIn(input: LinkedInSave) {
  const client = localClient();
  if (!client) throw new RequestError("Select a connected LinkedIn account in Zernio first.", 409);
  return client.saveLinkedIn(input);
}

export async function readLaunchEmails(accountId: string, allowedDomains: readonly string[]) {
  const client = localClient();
  if (!client) throw new RequestError("Connect Gmail or Outlook in Zernio first.", 409);
  return client.readLaunchEmails(accountId, allowedDomains);
}
