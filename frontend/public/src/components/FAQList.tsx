import { useState } from "react";

export interface FAQItemData {
  question: string;
  answer: string;
}

export default function FAQList({ items }: { items: FAQItemData[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-list">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className={`faq-item ${isOpen ? "active" : ""}`}>
            <button
              className="faq-question"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              {item.question}
              <span className="faq-icon">{isOpen ? "−" : "+"}</span>
            </button>
            <div
              className="faq-answer"
              style={{ maxHeight: isOpen ? "200px" : "0" }}
            >
              <div className="faq-answer-inner">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
