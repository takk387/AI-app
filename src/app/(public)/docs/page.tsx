import { Metadata } from 'next';
import Link from 'next/link';
import { MarketingNav, Footer } from '@/components/marketing';
import {
  BookOpenIcon,
  RocketIcon,
  MessageSquareIcon,
  BrainIcon,
  CubeIcon,
  ListChecksIcon,
} from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Documentation - AI App Builder',
  description: 'Learn how to use AI App Builder to create full-stack React applications with AI.',
};

const guides = [
  {
    icon: RocketIcon,
    title: 'Getting Started',
    description: 'Learn the basics of AI App Builder and create your first application in minutes.',
    href: '#getting-started',
  },
  {
    icon: MessageSquareIcon,
    title: 'Natural Conversation Wizard',
    description:
      'Use our structured concept-building system to extract your app idea through natural conversation.',
    href: '#conversation-wizard',
  },
  {
    icon: BrainIcon,
    title: 'Dual AI System',
    description: 'Learn how Gemini and Claude work together - Gemini for visuals, Claude for code.',
    href: '#dual-ai',
  },
  {
    icon: CubeIcon,
    title: 'Phased Generation',
    description:
      'Understand how your app is built in 2-25+ intelligent phases based on complexity.',
    href: '#phased-generation',
  },
  {
    icon: ListChecksIcon,
    title: 'Builder Tab',
    description: 'Compare what was planned vs what was built at each phase to ensure accuracy.',
    href: '#builder-tab',
  },
];

export default function DocsPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <BookOpenIcon size={32} className="text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Everything you need to know about building applications with AI App Builder.
            </p>
          </div>

          {/* Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {guides.map((guide) => (
              <a
                key={guide.title}
                href={guide.href}
                className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <guide.icon
                    size={20}
                    className="text-zinc-400 group-hover:text-blue-400 transition-colors"
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{guide.title}</h3>
                <p className="text-zinc-400 text-sm">{guide.description}</p>
              </a>
            ))}
          </div>

          {/* Getting Started Section */}
          <section id="getting-started" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Getting Started</h2>
            <div className="prose prose-invert prose-zinc max-w-none">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">1. Create an Account</h3>
                <p className="text-zinc-400">
                  Sign up for a free account to get started. No credit card required.
                </p>

                <h3 className="text-lg font-semibold text-white">2. Describe Your App</h3>
                <p className="text-zinc-400">
                  Use natural language to describe what you want to build. Be as detailed as you
                  like - our AI understands context and can ask clarifying questions.
                </p>

                <h3 className="text-lg font-semibold text-white">3. Review the Plan</h3>
                <p className="text-zinc-400">
                  The AI will create a detailed plan for your application, breaking it down into
                  manageable phases. Review and refine before building.
                </p>

                <h3 className="text-lg font-semibold text-white">4. Build & Preview</h3>
                <p className="text-zinc-400">
                  Watch as your application is built phase by phase. Preview in real-time and make
                  adjustments as needed.
                </p>
              </div>
            </div>
          </section>

          {/* Natural Conversation Wizard Section */}
          <section id="conversation-wizard" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Natural Conversation Wizard</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <p className="text-zinc-400">
                Unlike simple chat interfaces, our Natural Conversation Wizard is a structured
                concept-building system that intelligently extracts your app concept from natural
                conversation.
              </p>
              <h3 className="text-lg font-semibold text-white">Key Features:</h3>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>
                  <strong className="text-white">Draft Persistence</strong> - Your conversation is
                  auto-saved. Resume where you left off anytime.
                </li>
                <li>
                  <strong className="text-white">Context Preservation</strong> - Full conversation
                  history is preserved for nuanced understanding.
                </li>
                <li>
                  <strong className="text-white">Progressive Extraction</strong> - AI automatically
                  extracts features, user roles, and workflows from your description.
                </li>
                <li>
                  <strong className="text-white">Concept Snapshot</strong> - Your app concept is
                  captured and saved for reference throughout the build process.
                </li>
              </ul>
            </div>
          </section>

          {/* Dual AI System Section */}
          <section id="dual-ai" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Dual AI System</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <p className="text-zinc-400">
                AI App Builder uses two AI models working together to cover each other&apos;s
                limitations.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-purple-400 mb-2">Gemini - Creative Director</h4>
                  <ul className="text-zinc-400 text-sm space-y-1">
                    <li>Visual analysis of screenshots and designs</li>
                    <li>Color palette extraction</li>
                    <li>Motion and animation detection</li>
                    <li>UI/UX pattern recognition</li>
                  </ul>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <h4 className="font-semibold text-blue-400 mb-2">Claude - Precision Architect</h4>
                  <ul className="text-zinc-400 text-sm space-y-1">
                    <li>Code structure and architecture</li>
                    <li>Accessibility compliance</li>
                    <li>Type-safe code generation</li>
                    <li>Best practices implementation</li>
                  </ul>
                </div>
              </div>
              <p className="text-zinc-400 mt-4">
                <strong className="text-white">Intelligent Routing:</strong> The system
                automatically picks the right AI for each task, or uses pipeline mode where Gemini
                analyzes the design and Claude implements the code.
              </p>
            </div>
          </section>

          {/* Phased Generation Section */}
          <section id="phased-generation" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Phased Generation</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <p className="text-zinc-400">
                Complex applications are built in 2-25+ intelligent phases based on complexity. This
                prevents the broken, incomplete code that one-shot generation produces.
              </p>
              <h3 className="text-lg font-semibold text-white">How It Works:</h3>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>
                  <strong className="text-white">Complexity Analysis</strong> - AI analyzes your app
                  concept and determines optimal phase count.
                </li>
                <li>
                  <strong className="text-white">Dependency Mapping</strong> - Phases are ordered
                  based on dependencies (e.g., auth before dashboard).
                </li>
                <li>
                  <strong className="text-white">Validation</strong> - Each phase is reviewed and
                  validated before proceeding to the next.
                </li>
                <li>
                  <strong className="text-white">Context-Aware</strong> - Each phase builds on
                  previous phases with full context.
                </li>
              </ul>
            </div>
          </section>

          {/* Builder Tab Section */}
          <section id="builder-tab" className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6">Builder Tab (Planned vs Built)</h2>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <p className="text-zinc-400">
                The Builder Tab provides a visual side-by-side comparison of what was planned vs
                what was actually built.
              </p>
              <h3 className="text-lg font-semibold text-white">Features:</h3>
              <ul className="list-disc list-inside text-zinc-400 space-y-2">
                <li>
                  <strong className="text-white">Phase Overview</strong> - See what&apos;s being
                  built in each phase.
                </li>
                <li>
                  <strong className="text-white">Checkmark Comparison</strong> - Visual checkmarks
                  show completed vs pending items.
                </li>
                <li>
                  <strong className="text-white">Verification</strong> - Ensure everything matches
                  your plan before moving to the next phase.
                </li>
                <li>
                  <strong className="text-white">Progress Tracking</strong> - Track overall progress
                  across all phases.
                </li>
              </ul>
            </div>
          </section>

          {/* Quick Links */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/terms"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Pricing
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
