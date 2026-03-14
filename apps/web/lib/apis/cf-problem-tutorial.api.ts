import { api } from "../client";

export async function getProblemTutorial(
  contestId: number,
  problemIndex: string
): Promise<{ tutorial: string | null }> {
  const response = await api.get<{ tutorial: string | null }>(
    `/cf-problem-tutorial/${contestId}/${encodeURIComponent(problemIndex)}`
  );
  return response.data;
}

export async function upsertProblemTutorial(
  contestId: number,
  problemIndex: string,
  tutorial: string | null
): Promise<{ tutorial: string | null }> {
  const response = await api.patch<{ tutorial: string | null }>(
    `/cf-problem-tutorial/${contestId}/${encodeURIComponent(problemIndex)}`,
    { tutorial }
  );
  return response.data;
}
