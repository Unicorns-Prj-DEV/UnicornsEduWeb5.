export interface CfDocGroup {
  id: string;
  title: string;
  groupCode: string;
  websiteUrl: string;
}

export interface CfContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  preparedBy?: string;
  startTimeSeconds?: number;
}

export interface CfProblem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  tags: string[];
}
