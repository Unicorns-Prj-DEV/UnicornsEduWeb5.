import {
  MissingSurveyClassList,
  SetSurveyRoundPayload,
  SurveyRoundSummary,
} from "@/dtos/survey-round.dto";
import { api } from "../client";

export async function getSurveyRoundSummary(): Promise<SurveyRoundSummary> {
  const response = await api.get<SurveyRoundSummary>("/surveys/round");
  return response.data;
}

export async function getMissingSurveyClasses(params?: {
  page?: number;
  limit?: number;
}): Promise<MissingSurveyClassList> {
  const response = await api.get<MissingSurveyClassList>(
    "/surveys/missing-classes",
    {
      params: {
        ...(typeof params?.page === "number" ? { page: params.page } : {}),
        ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
      },
    },
  );
  return response.data;
}

export async function setSurveyRound(
  payload: SetSurveyRoundPayload,
): Promise<SurveyRoundSummary> {
  const response = await api.patch<SurveyRoundSummary>(
    "/surveys/round",
    payload,
  );
  return response.data;
}
