import { redirect } from "next/navigation";

/**
 * Alias: /landing-page → / (docs/pages/landing.md)
 */
export default function LandingPageRoute() {
  redirect("/");
}
