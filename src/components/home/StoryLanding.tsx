"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { clanStory } from "@/data/clan-story";
import { ClanTimeline } from "./ClanTimeline";

/** Ảnh nhà thờ / đình làng Việt — full-bleed hero */
const HALL_IMAGE =
  "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=2400&q=80";

export function StoryLanding() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.7]);

  return (
    <div className="story-root min-h-screen bg-[#dfe6ec] text-[#1c1410]">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 md:px-10">
        <p
          className="text-sm font-semibold tracking-wide text-[#fffdf8]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Giapha
        </p>
        <nav className="flex gap-4 text-sm font-medium text-[#fffdf8]/90">
          <a href="#timeline" className="hover:text-white">
            Cột mốc
          </a>
          <Link href="/cay" className="hover:text-white">
            Cây gia phả
          </Link>
        </nav>
      </header>

      <section
        ref={heroRef}
        className="relative flex min-h-[100svh] items-end overflow-hidden"
      >
        <motion.div className="absolute inset-0" style={{ y: imageY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HALL_IMAGE}
            alt="Nhà thờ họ uy nghiêm"
            className="h-[120%] w-full object-cover"
          />
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-[#120e0c] via-[#120e0c]/55 to-[#120e0c]/25"
          style={{ opacity: overlayOpacity }}
        />

        <div className="relative z-10 w-full px-5 pb-16 pt-32 md:px-10 md:pb-24">
          <motion.p
            className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e8d48a]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {clanStory.hallName}
          </motion.p>
          <motion.h1
            className="mt-3 max-w-3xl text-5xl font-semibold leading-[1.05] text-[#fffdf8] md:text-7xl"
            style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            Dòng họ {clanStory.clanName}
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-base text-[#f0e6d4]/90 md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
          >
            {clanStory.tagline}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28 }}
          >
            <Link
              href="/cay"
              className="inline-flex items-center bg-[#7a1f1f] px-5 py-3 text-sm font-semibold text-[#fffdf8] transition hover:bg-[#5e1717]"
            >
              Xem cây gia phả
            </Link>
            <a
              href="#timeline"
              className="inline-flex items-center border border-[#fffdf8]/45 px-5 py-3 text-sm font-semibold text-[#fffdf8] transition hover:bg-[#fffdf8]/10"
            >
              Đọc cột mốc
            </a>
          </motion.div>
        </div>
      </section>

      <div id="timeline">
        <ClanTimeline milestones={clanStory.milestones} />
      </div>

      <section className="border-t border-[#8a6a3a]/25 px-5 py-16 md:px-10">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2
              className="text-2xl font-semibold text-[#1c1410]"
              style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
            >
              {clanStory.heroCaption}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-[#5c564e]">
              Double-click một người trên cây để xem tên húy, thụy, tiểu sử và lịch
              giỗ âm lịch.
            </p>
          </div>
          <Link
            href="/cay"
            className="inline-flex shrink-0 bg-[#1c1410] px-5 py-3 text-sm font-semibold text-[#fffdf8]"
          >
            Vào cây tương tác
          </Link>
        </div>
      </section>
    </div>
  );
}
