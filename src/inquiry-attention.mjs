// A saved review is complete independently of whether a commercial client is linked.
export const employerNeedsReview = (q = {}) => !q.commercialClientId && !['Processed','Linked'].includes(q.status) && q.review?.status !== 'Reviewed';
export function enquiryAttentionCounts({ contacts = [], intakes = [], employers = [], seminars = [], feedback = [] } = {}) {
 const counts = { contacts:contacts.filter(q=>q.status==='New').length, intakes:intakes.filter(q=>q.status==='New'&&!q.convertedClientId).length, employers:employers.filter(employerNeedsReview).length, seminars:seminars.filter(q=>q.status==='New').length, feedback:feedback.filter(q=>q.status==='New').length };
 return {...counts,total:Object.values(counts).reduce((sum,n)=>sum+n,0)};
}
