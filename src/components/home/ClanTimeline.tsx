"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Flame,
  GitBranch,
  Landmark,
  Network,
  Sprout,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";
import type { ClanMilestone, MilestoneIcon } from "@/data/clan-story";
import { MilestoneArt } from "./MilestoneArt";
import "./clan-timeline.css";

type ClanTimelineProps = {
  milestones: ClanMilestone[];
};

const ICON_MAP: Record<MilestoneIcon, LucideIcon> = {
  founder: Landmark,
  settle: Sprout,
  branches: GitBranch,
  flame: Flame,
  temple: Building2,
  tree: Network,
};

export function ClanTimeline({ milestones }: ClanTimelineProps) {
  return (
    <section id="cot-moc" className="clan-timeline relative px-5 py-20 md:px-10 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="clan-timeline__glow clan-timeline__glow--a" />
        <div className="clan-timeline__glow clan-timeline__glow--b" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
        >
          <p className="gp-eyebrow inline-flex items-center gap-2">
            <TreeDeciduous size={14} aria-hidden />
            Cột mốc dòng họ
          </p>
          <h2 className="gp-title mt-3 text-3xl md:text-4xl">
            Từ Thủy tổ đến gia phả số
          </h2>
          <p className="gp-lede mx-auto mt-3 max-w-2xl text-sm md:text-base">
            Ví dụ hành trình hương hỏa điển hình — Thủy tổ, lập nghiệp, mở chi, giữ lửa —
            để bạn hình dung cách kể chuyện dòng họ trên Giapha.
          </p>
        </motion.div>

        <div className="relative mt-16">
          {/* Trục thời gian */}
          <motion.div
            aria-hidden
            className="clan-timeline__axis absolute left-5 top-0 bottom-0 w-px md:left-1/2 md:-translate-x-1/2"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top center" }}
          />

          <ol className="space-y-14 md:space-y-20">
            {milestones.map((item, index) => {
              const fromLeft = item.side === "left";
              const Icon = ICON_MAP[item.icon];

              return (
                <motion.li
                  key={item.id}
                  className="relative grid items-center gap-6 md:grid-cols-2 md:gap-12"
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.6,
                    delay: Math.min(index * 0.04, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Node trên trục */}
                  <motion.span
                    aria-hidden
                    className="clan-timeline__node absolute left-5 top-8 z-10 -translate-x-1/2 md:left-1/2 md:top-1/2 md:-translate-y-1/2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </motion.span>

                  {/* Text + art: đảo thứ tự theo side trên desktop */}
                  <div
                    className={[
                      "pl-12 md:pl-0",
                      fromLeft
                        ? "md:col-start-1 md:pr-10 md:text-right"
                        : "md:col-start-2 md:pl-10",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "clan-timeline__card",
                        fromLeft ? "md:ml-auto" : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex flex-wrap items-center gap-2",
                          fromLeft ? "md:justify-end" : "",
                        ].join(" ")}
                      >
                        <span className="clan-timeline__era">{item.era}</span>
                        <span className="clan-timeline__icon-chip" aria-hidden>
                          <Icon size={14} />
                        </span>
                      </div>
                      <h3 className="gp-title mt-2 text-xl md:text-2xl">{item.title}</h3>
                      <p className="gp-lede mt-2 text-sm leading-relaxed md:text-[15px]">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div
                    className={[
                      "hidden justify-center md:flex",
                      fromLeft ? "md:col-start-2" : "md:col-start-1 md:row-start-1",
                    ].join(" ")}
                  >
                    <MilestoneArt icon={item.icon} title={item.title} />
                  </div>

                  {/* Mobile: art dưới text */}
                  <div className="flex justify-center pl-12 md:hidden">
                    <MilestoneArt icon={item.icon} title={item.title} />
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
