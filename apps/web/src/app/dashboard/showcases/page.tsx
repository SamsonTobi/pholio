import { redirect } from "next/navigation";

export default function ShowcasesRedirectPage() {
  redirect("/dashboard/projects");
}
