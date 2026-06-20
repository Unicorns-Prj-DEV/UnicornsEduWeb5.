export interface SurveyRoundSummary {
  currentRound: number;
  totalRunningClasses: number;
  reportedCount: number;
  missingCount: number;
}

export interface MissingSurveyClass {
  classId: string;
  name: string;
  teachers: string[];
  latestReportedRound: number | null;
  lastReportDate: string | null;
}

export interface MissingSurveyClassList {
  data: MissingSurveyClass[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface SetSurveyRoundPayload {
  number: number;
}
