import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

export default function Reveal({ 
  children, 
  className = '', 
  style 
}: { 
  children: ReactNode; 
  className?: string; 
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${className}`.trim()} style={style}>{children}</div>;
}