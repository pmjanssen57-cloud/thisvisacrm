const text = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const name = (value) => text(value).replace(/[^\p{L}\p{N}]/gu, '');
const nzbn = (value) => String(value || '').replace(/\D/g, '');
export function employerMatchReasons(questionnaire, client) {
  const reasons = [];
  if (nzbn(questionnaire.nzbn) && nzbn(questionnaire.nzbn) === nzbn(client.nzbn)) reasons.push('NZBN');
  const names = [questionnaire.legalName, questionnaire.tradingName].map(name).filter(Boolean);
  if ([client.legalName, client.tradingName].some((value) => name(value) && names.includes(name(value)))) reasons.push('Business name');
  if (text(questionnaire.contactEmail) && text(questionnaire.contactEmail) === text(client.primaryContactEmail)) reasons.push('Contact email');
  return reasons;
}
export function relatedEmployerQuestionnaires(questionnaire, rows) {
  return rows.filter((row) => row.id !== questionnaire.id && employerMatchReasons(questionnaire, {
    ...row, primaryContactEmail: row.contactEmail,
  }).length);
}
