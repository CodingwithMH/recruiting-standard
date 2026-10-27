import Navigation from "@/components/shared/Navigation";
import Footer from "@/components/shared/Footer";

// All public marketing pages share this layout (nav + footer).
// Portal/auth routes live outside this group and get their own layout.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main>{children}</main>
      <Footer />
    </>
  );
}
