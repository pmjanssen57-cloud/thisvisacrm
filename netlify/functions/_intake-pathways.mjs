export const INTAKE_PATHWAYS = ['Skilled Migrant Category (SMC)','Green List','Partnership','Dependent children','Other family','Investor / business','Work visa','Visitor visa','Student visa','Other / discuss at consultation'];
const wording = [
 'We recommend discussing the Skilled Migrant Category pathway. At the consultation, we will work through your qualifications, skilled employment and the evidence needed to assess your residence options.',
 'We recommend discussing the Green List pathway. We will review your role, employment circumstances, qualifications and any registration requirements, and explain the next steps relevant to your situation.',
 'We recommend discussing a partnership pathway. We will talk through your relationship, time living together and supporting evidence, along with your partner’s circumstances and your plans in New Zealand.',
 'We recommend discussing a pathway for your dependent children. We will review their circumstances, the parents’ visa position and the evidence of relationship, care arrangements and dependence that may be needed.',
 'We recommend discussing your family immigration options. We will talk through who is included, your family relationships and circumstances, and the evidence relevant to the proposed application.',
 'We recommend discussing your investor or business immigration options. We will explore your investment objectives, available funds, source of funds and intended involvement in New Zealand, and outline the next steps for a detailed assessment.',
 'We recommend discussing your work visa options. We will review your proposed role, employer, experience and qualifications, and identify the next steps and supporting evidence.',
 'We recommend discussing a visitor visa pathway. We will talk through the purpose and length of your visit, your plans, available support and the evidence relevant to your application.',
 'We recommend discussing a student visa pathway. We will review your study plans, proposed course, funding and personal circumstances, and outline the evidence and next steps.',
 'We would welcome a consultation to discuss your circumstances and identify the most suitable options and next steps.'
];
export function intakeApprovalDraft(intake={}, adviser={}) {
 const index=INTAKE_PATHWAYS.indexOf(intake.recommendedPathway);
 const paragraph=index<0?wording[9]:wording[index];
 return {subject:'Your Turner Hopkins assessment — next steps',bodyText:`Hello ${intake.firstName || 'there'},\n\nThank you for completing our assessment questionnaire. We have reviewed the information you provided and would be pleased to arrange a consultation with you.\n\n${paragraph}\n\nThe consultation is an opportunity to confirm the requirements, discuss any points that need further review and agree a practical plan. This invitation does not confirm visa eligibility or guarantee an application outcome.\n\nPlease use the secure booking link below to choose a suitable time.${adviser.name ? ` Your adviser is ${adviser.name}.` : ''}\n\nWe look forward to speaking with you.\n\nKind regards,\n${adviser.name || 'The Turner Hopkins team'}\nTurner Hopkins Immigration Specialists`};
}
export function validateApprovalEdit(edit) {
 if(!edit || typeof edit.subject!=='string' || typeof edit.bodyText!=='string' || !edit.subject.trim() || !edit.bodyText.trim() || edit.subject.length>250 || edit.bodyText.length>20000 || /[\r\n]/.test(edit.subject)) throw Error('Enter a subject (up to 250 characters) and message (up to 20,000 characters).');
 return {subject:edit.subject.trim(),bodyText:edit.bodyText.trim()};
}
