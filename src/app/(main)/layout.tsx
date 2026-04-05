import Navbar from "@/components/auth/Navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full min-w-0 px-4 pb-16 sm:px-6">
        {children}
      </main>
    </>
  );
}
