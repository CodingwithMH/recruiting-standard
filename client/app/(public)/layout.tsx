import Navigation from "@/components/shared/Navigation";
import Footer from "@/components/shared/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#102341] focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <Navigation />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
