import { MarketingFooter } from "./_components/marketing-footer";
import { MarketingNav } from "./_components/marketing-nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark bg-background text-foreground min-h-svh">
      <MarketingNav />
      <main className="relative">{children}</main>
      <MarketingFooter />
    </div>
  );
}
