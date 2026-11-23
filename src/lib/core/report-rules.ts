export const REPORT_REASONS=['spam','harassment','nudity','violence','false-info','other'] as const;
export type ReportReason=typeof REPORT_REASONS[number];
export function validReportReason(value:unknown):value is ReportReason{
 return typeof value==='string'&&REPORT_REASONS.some(reason=>reason===value);
}
