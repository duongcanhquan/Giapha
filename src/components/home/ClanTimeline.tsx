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
        <motion.p
          className="gp-eyebrow text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Hương hỏa
        </motion.p>
        <motion.h2
          className="gp-title mt-3 text-center text-3xl md:text-4xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55 }}
        >
          Giữ mạch hương hỏa
        </motion.h2>
        <motion.p
          className="gp-lede mx-auto mt-3 max-w-xl text-center text-sm md:text-base"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          Từ bàn thờ tổ tiên đến sổ gia phả số — mỗi nhà một không gian riêng, tra cứu
          và chia sẻ trong họ hàng.
        </motion.p>

        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-[var(--gp-lacquer)]/10 via-[var(--gp-gold)]/70 to-[var(--gp-lacquer)]/10 md:left-1/2 md:-translate-x-1/2"
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
                    x: fromLeft ? -48 : 48,
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
                    <p className="gp-eyebrow">{item.year}</p>
                    <h3 className="gp-title mt-1 text-xl">{item.title}</h3>
                    <p className="gp-lede mt-2 text-sm leading-relaxed md:text-[15px]">
                      {item.body}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="gp-seal-dot absolute left-[0.7rem] top-1.5 md:left-1/2 md:-translate-x-1/2"
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
