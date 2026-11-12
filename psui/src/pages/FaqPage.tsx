import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { CtaBand } from "../components/landing/CtaBand";
import { FAQ } from "../components/landing/faq";
import { FaqAccordion } from "../components/landing/FaqAccordion";
import { EASE, Reveal } from "../components/landing/Reveal";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function FaqPage() {
  useDocumentTitle("FAQ", "Answers about Polestar: voting, how the budget is split, milestone payments, and working with your SputnikDAO.");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return FAQ;
    return FAQ.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const haystack = `${item.question} ${item.answer.join(" ")}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      }),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="page-marketing">
      <header className="page-hero page-hero--compact">
        <div className="page-hero__inner">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            FAQ
          </motion.span>
          <motion.h1
            className="display page-hero__title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          >
            Questions, answered.
          </motion.h1>
          <motion.div
            className="faq-search"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          >
            <Search aria-hidden size={20} className="faq-search__icon" />
            <label htmlFor="faq-filter" className="visually-hidden">
              Filter questions
            </label>
            <input
              id="faq-filter"
              type="search"
              className="faq-search__input"
              placeholder="Search questions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {query && (
              <button type="button" className="faq-search__clear" aria-label="Clear search" onClick={() => setQuery("")}>
                <X aria-hidden size={18} />
              </button>
            )}
          </motion.div>
          <p className="visually-hidden" aria-live="polite">
            {query ? `${count} matching question${count === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </header>

      <section className="section section--flush">
        <div className="section__inner faq-layout">
          <nav className="faq-layout__toc" aria-label="Topics">
            <span className="label">Topics</span>
            <ul>
              {FAQ.map((group) => (
                <li key={group.id}>
                  <a href={`#${group.id}`}>{group.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="faq-layout__groups">
            {groups.length === 0 && (
              <p className="faq-empty">No questions match "{query}". Try fewer words, or browse the topics.</p>
            )}
            {groups.map((group) => (
              <Reveal key={group.id} className="faq-group" id={group.id}>
                <h2 className="faq-group__title">{group.title}</h2>
                <FaqAccordion items={group.items} linkable expandAll={query.trim().length > 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </div>
  );
}
