import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/auth";

export default async function HomePage() {
  const token = await getAccessToken();
  if (token) {
    redirect("/admin");
  }
  redirect("/login");
}
