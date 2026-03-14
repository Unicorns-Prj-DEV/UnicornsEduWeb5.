import type {
  CfContest,
  CfDocGroup,
  CfProblem,
} from "@/dtos/codeforces.dto";
import { api } from "../client";

export async function getCodeforcesDocGroups(): Promise<CfDocGroup[]> {
  const response = await api.get<CfDocGroup[]>("/codeforces/doc-groups");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getCodeforcesContests(
  groupCode: string
): Promise<CfContest[]> {
  const response = await api.get<CfContest[]>("/codeforces/contests", {
    params: { groupCode },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getCodeforcesContestProblems(
  contestId: number
): Promise<CfProblem[]> {
  const response = await api.get<CfProblem[]>(
    `/codeforces/contests/${contestId}/problems`
  );
  return Array.isArray(response.data) ? response.data : [];
}
