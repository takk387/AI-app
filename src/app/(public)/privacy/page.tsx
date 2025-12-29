import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav, Footer } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Privacy Policy - AI App Builder',
  description: 'Privacy Policy for AI App Builder - how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-zinc-400">
              Last updated:{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-zinc max-w-none">
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
                <p className="text-zinc-400 leading-relaxed mb-4">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-2">
                  <li>Account information (email, name)</li>
                  <li>Project data and generated code</li>
                  <li>Usage data and preferences</li>
                  <li>Communications with our support team</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                  2. How We Use Your Information
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process your requests and transactions</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Develop new features and services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">
                  3. Data Storage and Security
                </h2>
                <p className="text-zinc-400 leading-relaxed">
                  Your data is stored securely using industry-standard encryption. We use Supabase
                  for database and authentication services, which provides enterprise-grade
                  security. Your generated code and project data are stored in secure cloud
                  infrastructure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">4. AI Processing</h2>
                <p className="text-zinc-400 leading-relaxed">
                  When you use AI App Builder, your prompts and project context are sent to our AI
                  providers (Google Gemini for visual analysis, Anthropic Claude for code
                  generation) to process your requests. This data is processed in accordance with
                  our providers&apos; privacy policies and is not used to train AI models.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">5. Data Sharing</h2>
                <p className="text-zinc-400 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-2">
                  <li>Service providers who assist in our operations</li>
                  <li>Legal authorities when required by law</li>
                  <li>Other parties with your consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
                <p className="text-zinc-400 leading-relaxed mb-4">You have the right to:</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-2">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your project data</li>
                  <li>Opt out of marketing communications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
                <p className="text-zinc-400 leading-relaxed">
                  We use essential cookies to maintain your session and preferences. We do not use
                  tracking cookies for advertising purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
                <p className="text-zinc-400 leading-relaxed">
                  We may update this privacy policy from time to time. We will notify you of any
                  changes by posting the new policy on this page and updating the &quot;Last
                  updated&quot; date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
                <p className="text-zinc-400 leading-relaxed">
                  If you have questions about this privacy policy or your data, please contact us at{' '}
                  <a
                    href="mailto:privacy@aiappbuilder.com"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    privacy@aiappbuilder.com
                  </a>
                </p>
              </section>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
