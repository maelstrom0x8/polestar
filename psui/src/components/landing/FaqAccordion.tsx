import { ArrowRight, ArrowUpRight, Check, ChevronDown, Link2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { FaqItem } from "./faq";
import { EASE } from "./Reveal";

interface Props {
  items: FaqItem[];
  linkable?: boolean;
  expandAll?: boolean;
}

export function FaqAccordion({ items, linkable = false, expandAll = false }: Props) {
  const { hash } = useLocation();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (id && items.some((item) => item.id === id)) setOpen((current) => new Set(current).add(id));
  }, [hash, items]);

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyLink(id: string) {
    const url = `${window.location.origin}/faq#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((value) => (value === id ? null : value)), 1600);
    } catch {
      window.location.hash = id;
    }
  }

  return (
    <div className="faq">
      {items.map((item) => {
        const expanded = expandAll || open.has(item.id);
        return (
          <div className={`faq__item${expanded ? " faq__item--open" : ""}`} key={item.id} id={linkable ? item.id : undefined}>
            <h3 className="faq__heading">
              <button
                type="button"
                className="faq__question"
                aria-expanded={expanded}
                aria-controls={`${item.id}-answer`}
                onClick={() => toggle(item.id)}
              >
                <span>{item.question}</span>
                <motion.span
                  className="faq__chevron"
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <ChevronDown aria-hidden size={20} />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`${item.id}-answer`}
                  className="faq__answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <div className="faq__answer-inner">
                    {item.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    <div className="faq__actions">
                      {item.link?.to && (
                        <Link to={item.link.to} className="text-link">
                          {item.link.label} <ArrowRight aria-hidden size={16} />
                        </Link>
                      )}
                      {item.link?.href && (
                        <a href={item.link.href} target="_blank" rel="noreferrer" className="text-link">
                          {item.link.label} <ArrowUpRight aria-hidden size={16} />
                        </a>
                      )}
                      {linkable && (
                        <button type="button" className="faq__copy" onClick={() => copyLink(item.id)}>
                          {copied === item.id ? <Check aria-hidden size={14} /> : <Link2 aria-hidden size={14} />}
                          {copied === item.id ? "Link copied" : "Copy link"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
