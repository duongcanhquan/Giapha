"use client";

import { motion } from "framer-motion";
import type { ClanMilestone } from "@/data/clan-story";

type ClanTimelineProps = {
  milestones: ClanMilestone[];
};

export function ClanTimeline({ milestones }: ClanTimelineProps) {
  return (
    <section className="relative px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          className="text-center text-3xl font-semibold text-[#1c1410] md:text-4xl"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
        >
          Cột mốc dòng họ
        </motion.h2>
        <motion.p
          className="mx-auto mt-3 max-w-xl text-center text-sm text-[#5c564e] md:text-base"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Những bước chân đã dựng nên nhà thờ và giữ mạch hương hỏa đến hôm nay.
        </motion.p>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-[#7a1f1f]/10 via-[#c9a227]/70 to-[#7a1f1f]/10 md:left-1/2 md:-translate-x-1/2"
          />

          <ol className="space-y-10 md:space-y-14">
            {milestones.map((item, index) => {
              const fromLeft = item.side === "left";
              return (
                <motion.li
                  key={item.id}
                  className="relative grid md:grid-cols-2 md:gap-10"
                  initial={{
                    opacity: 0,
                    x: fromLeft ? -64 : 64,
                  }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{
                    duration: 0.55,
                    delay: Math.min(index * 0.05, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div
                    className={[
                      "pl-10 md:pl-0",
                      fromLeft ? "md:pr-10 md:text-right" : "md:col-start-2 md:pl-10",
                    ].join(" ")}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a1f1f]">
                      {item.year}
                    </p>
                    <h3
                      className="mt-1 text-xl font-semibold text-[#1c1410]"
                      style={{
                        fontFamily: "var(--font-literata), Literata, Georgia, serif",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5c564e] md:text-[15px]">
                      {item.body}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="absolute left-4 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[#fffdf8] bg-[#c9a227] shadow-[0_0_0_3px_rgba(122,31,31,0.25)] md:left-1/2"
                  />
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
