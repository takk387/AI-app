import { Metadata } from 'next';
import {
  MarketingNav,
  HeroSection,
  FeaturesGrid,
  ComparisonTable,
  CTASection,
  Footer,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'AI App Builder - Build Full-Stack React Apps with AI',
  description:
    'The only AI app builder with planning mode, visual design understanding, and intelligent phased code generation. Build complete React applications, not just components.',
  openGraph: {
    title: 'AI App Builder - Build Full-Stack React Apps with AI',
    description:
      'The only AI app builder with planning mode, visual design understanding, and intelligent phased code generation.',
    type: 'website',
  },
};

export default function MarketingHomePage() {
  return (
    <>
      <MarketingNav />
      <main>
        <HeroSection />
        <div id="features">
          <FeaturesGrid />
        </div>
        <ComparisonTable />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
