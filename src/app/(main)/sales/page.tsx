import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SalesPage() {
  redirect("/sales/records");
}
