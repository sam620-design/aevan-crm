import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "SUPERADMIN") {
    redirect("/superadmin");
  } else if (user.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/staff");
  }
}
