import { prizeEmailTemplate } from "./db";

export async function getPrizeWinnerEmailTemplate(): Promise<string | null> {
  return prizeEmailTemplate.getBody();
}
