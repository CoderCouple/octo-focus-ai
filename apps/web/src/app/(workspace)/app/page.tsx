import { redirect } from "next/navigation";

// "Home" was removed from the sidebar in favor of dedicated Projects /
// Notes / Canvas / Meetings tabs. /app stays as a landing route so
// older links and the post-login redirect keep working — it just
// forwards to the projects list.
export default function WorkspaceHomeRedirect() {
  redirect("/app/projects");
}
