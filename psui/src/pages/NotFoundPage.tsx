import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { EASE } from "../components/landing/Reveal";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="not-found">
      <motion.span
        className="not-found__code figure"
        aria-hidden="true"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        404
      </motion.span>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
      >
        <h1 className="not-found__title">This page doesn't exist.</h1>
        <p className="not-found__body">The link may be old, or the address mistyped.</p>
        <div className="not-found__actions">
          <Link to="/rounds" className="btn btn-primary btn-arrow">
            Browse rounds <ArrowRight aria-hidden size={18} />
          </Link>
          <Link to="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
