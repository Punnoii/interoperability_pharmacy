"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  Code2,
  Database,
  GitCompare,
  HelpCircle,
  Rocket,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useDarkMode } from "@/lib/useDarkMode";
import { themeClasses } from "@/lib/themeClasses";

// static user guide / FAQ, no data fetching, just docs laid out in themed sections
export default function HelpPage() {
  const [isDark, setIsDark] = useDarkMode();
  // tc bundles the light/dark class strings so we don't repeat ternaries everywhere
  const tc = themeClasses(isDark);
  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900";

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      <main className="flex-1 px-6 py-8 max-w-4xl w-full mx-auto">
        <Link
          href="/homepage"
          className={`inline-flex items-center gap-2 text-sm font-medium mb-4 ${
            isDark ? "text-slate-400 hover:text-slate-100" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${tc.heading}`} style={{ fontFamily: "Georgia, serif" }}>
            Help & User Guide
          </h1>
          <p className={`text-sm mt-2 ${tc.muted}`}>
            Learn how to use RxVKG Pharmacy Virtual Knowledge Graph.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <Section icon={<Rocket size={16} />} title="Getting Started" tc={tc}>
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              <strong>RxVKG</strong> is a knowledge-graph system for drug data. It links data from PostgreSQL through
              Trino and Ontop, and lets you query it with SPARQL the standard query language for RDF data.
            </p>
            <ul className={`text-sm leading-relaxed list-disc pl-5 ${tc.subtle} flex flex-col gap-1.5`}>
              <li><strong>Query</strong>: search drugs by name, NDC code, ATC code, etc.</li>
              <li><strong>Similarity</strong>: compare drugs by ELH ontology or by name (Jaccard).</li>
              <li><strong>Upload</strong>: load your own ontology + data into a private sandbox.</li>
              <li><strong>History</strong>: automatic record of every query you run.</li>
            </ul>
            <NavLinks tc={tc} links={[
              { href: "/homepage", label: "Open Query" },
              { href: "/settings", label: "Settings" },
            ]} />
          </Section>

          <Section icon={<Search size={16} />} title="Query" tc={tc}>
            <SubHead icon={<Code2 size={14} />} text="Manual SPARQL" tc={tc} />
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Write SPARQL directly in the editor. Includes autocomplete for drug names, query templates,
              and saved bookmarks. Press <Kbd tc={tc}>Ctrl</Kbd> + <Kbd tc={tc}>Enter</Kbd> to run.
            </p>

            <SubHead icon={<Sparkles size={14} />} text="NLP to Query" tc={tc} />
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Type in plain Thai or English (e.g. <em>&quot;Find all drugs&quot;</em>) and the system
              uses Gemini to generate SPARQL automatically. Review the generated query before running it.
            </p>

            <SubHead icon={<Database size={14} />} text="Result Views" tc={tc} />
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Switch between <strong>Table</strong> view (paginated rows) and <strong>Graph</strong> view
              (D3 force directed visualization with nodes + links). Click a node in graph view to see its
              details and neighbours.
            </p>
          </Section>

          <Section icon={<GitCompare size={16} />} title="Similarity" tc={tc}>
            <SubHead icon={<Atom size={14} />} text="Substance Similarity (ELH)" tc={tc} />
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Uses an Ontology based ELH similarity engine over the ATC ontology. Three sub tabs:
            </p>
            <ul className={`text-sm leading-relaxed list-disc pl-5 ${tc.subtle} flex flex-col gap-1`}>
              <li><strong>Pair Compare</strong>: score similarity between two ATC concepts (e.g. M01AE01 vs M01AE02).</li>
              <li><strong>Find Top-K</strong>: rank the K most similar drugs to a target concept.</li>
              <li><strong>Expand SPARQL</strong>: annotate a SPARQL query (e.g. <code className={tc.muted}>{`# @expand:?drug=M01AE01:k=5`}</code>) and the system injects similar drugs as VALUES.</li>
            </ul>

            <SubHead icon={<Search size={14} />} text="Query Name Similarity (Jaccard)" tc={tc} />
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Compares substance names using Jaccard similarity on word tokens and character trigrams.
              Useful for finding duplicate or near duplicate names across data sources.
            </p>
          </Section>

          <Section icon={<Upload size={16} />} title="Upload (Sandbox)" tc={tc}>
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Upload your own configuration to try the system with your own data. Five file slots:
            </p>
            <ul className={`text-sm leading-relaxed list-disc pl-5 ${tc.subtle} flex flex-col gap-1`}>
              <li><strong>Ontology</strong>: <code className={tc.muted}>.owl / .ttl / .rdf</code></li>
              <li><strong>Database</strong>: <code className={tc.muted}>.csv / .sql / .json</code></li>
              <li><strong>Mapping File</strong>: <code className={tc.muted}>.obda / .ttl</code> (R2RML or OBDA)</li>
              <li><strong>Property File</strong>: <code className={tc.muted}>.properties</code> (JDBC settings)</li>
              <li><strong>Catalog File</strong>: <code className={tc.muted}>.xml</code></li>
            </ul>
            <p className={`text-sm leading-relaxed ${tc.subtle}`}>
              Files stay in an in-memory sandbox for <strong>30 minutes</strong> idle. Click
              <strong> Save as My Profile</strong> to keep them permanently.
            </p>
          </Section>

          <Section icon={<HelpCircle size={16} />} title="FAQ" tc={tc}>
            <FaqItem
              q="My query returns no results. Why?"
              a="Check the PREFIX declarations match the ontology. Use the 'All substances' template as a starting point. it works out of the box."
              tc={tc}
            />
            <FaqItem
              q="The query is slow on first run, then fast. Why?"
              a="The backend caches SPARQL results in memory (Spring Cache + Caffeine). The same query gets served from cache after the first request. You can clear it in Settings to Data to Clear server cache."
              tc={tc}
            />
            <FaqItem
              q="Will my Upload files be saved forever?"
              a="No sandbox files live in RAM and expire after 30 minutes idle. To keep them permanently, click 'Save as My Profile'."
              tc={tc}
            />
            <FaqItem
              q="How do I share a query with someone?"
              a="Click 'Save' in the query panel to bookmark it under your account. Bookmarks are visible from the sidebar on the Query page."
              tc={tc}
            />
            <FaqItem
              q="Why can I switch dark mode but my preference doesn't persist across devices?"
              a="Dark mode is saved both in localStorage and to your user profile on the backend, so it syncs across devices when you sign in."
              tc={tc}
            />
          </Section>

        </div>
      </main>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  tc: ReturnType<typeof themeClasses>;
  children: React.ReactNode;
}

// titled card with an icon header, one per help topic
function Section({ icon, title, tc, children }: SectionProps) {
  return (
    <section className={`rounded-2xl border ${tc.card}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${tc.rowDiv}`}>
        <span className="text-blue-600">{icon}</span>
        <h2 className={`text-sm font-bold ${tc.heading}`}>{title}</h2>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {children}
      </div>
    </section>
  );
}

// small labelled divider inside a Section
function SubHead({ icon, text, tc }: { icon: React.ReactNode; text: string; tc: ReturnType<typeof themeClasses> }) {
  return (
    <div className="flex items-center gap-1.5 mt-2 first:mt-0">
      <span className="text-blue-600">{icon}</span>
      <h3 className={`text-xs font-bold uppercase tracking-wider ${tc.heading}`}>{text}</h3>
    </div>
  );
}

// renders a keyboard key like Ctrl / Enter inline in the docs
function Kbd({ children, tc }: { children: React.ReactNode; tc: ReturnType<typeof themeClasses> }) {
  return (
    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${tc.btnBase}`}>
      {children}
    </kbd>
  );
}

// row of pill links pointing at other pages of the app
function NavLinks({ tc, links }: { tc: ReturnType<typeof themeClasses>; links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border font-medium ${tc.btnBase}`}
        >
          <span>{l.label}</span>
          <ArrowRight size={12} />
        </Link>
      ))}
    </div>
  );
}

// native <details> accordion, one collapsible Q/A
function FaqItem({ q, a, tc }: { q: string; a: string; tc: ReturnType<typeof themeClasses> }) {
  return (
    <details className={`group rounded border ${tc.rowDiv}`}>
      <summary className={`flex items-center justify-between cursor-pointer px-3 py-2 text-sm font-medium ${tc.text}`}>
        <span>{q}</span>
        <span className={`text-xs ${tc.muted} group-open:rotate-90 transition-transform`}>▶</span>
      </summary>
      <p className={`text-sm leading-relaxed px-3 pb-3 ${tc.subtle}`}>{a}</p>
    </details>
  );
}
