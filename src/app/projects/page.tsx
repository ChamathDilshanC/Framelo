import { redirect } from "next/navigation";

/** `/projects` and `/dashboard` are the same place; one of them is canonical. */
export default function ProjectsPage() {
  redirect("/dashboard");
}
