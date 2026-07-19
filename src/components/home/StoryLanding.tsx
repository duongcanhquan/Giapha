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
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.42, 0.72]);

  return (
    <div className="min-h-screen bg-[var(--gp-paper)] text-[var(--gp-ink)]">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10">
        <p className="font-display text-base font-semibold tracking-[0.08em] text-[var(--gp-seal-ink)] md:text-lg">
          Giapha
        </p>
        <nav className="flex items-center gap-5 text-sm font-medium text-[var(--gp-seal-ink)]/90">
          <a href="#timeline" className="hidden hover:text-white sm:inline">
            Cột mốc
          </a>
          <Link href="/tree/family-demo-nguyen" className="hover:text-white">
            Tra cứu cây
          </Link>
          <Link href="/login" className="hover:text-white">
            Đăng nhập
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
            alt="Không gian nhà thờ họ uy nghiêm"
            className="h-[120%] w-full object-cover"
          />
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-[#120e0c] via-[#120e0c]/55 to-[#120e0c]/2"
          style={{ opacity: overlayOpacity }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#120e0c]/35 to-transparent"
        />

        <div className="relative z-10 w-full px-5 pb-16 pt-36 md:px-10 md:pb-24">
          <motion.h1
            className="font-display max-w-4xl text-5xl font-semibold leading-[1.02] text-[var(--gp-seal-ink)] md:text-7xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            Giapha
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-base text-[#f0e6d4]/92 md:text-lg"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
          >
            Gia phả số linh thiêng — tra cứu thông minh, giữ hương hỏa cho thế hệ sau.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
          >
            <Link href="/register" className="gp-btn gp-btn-primary">
              Tạo gia phả của bạn
            </Link>
            <Link
              href="/tree/family-demo-nguyen"
              className="gp-btn gp-btn-outline-light"
            >
              Xem bản demo dòng họ {clanStory.clanName}
            </Link>
          </motion.div>
        </div>
      </section>

      <div id="timeline">
        <ClanTimeline milestones={clanStory.milestones} />
      </div>

      <section className="border-t border-[var(--gp-scroll-edge)] px-5 py-16 md:px-10">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="gp-eyebrow">Dòng họ {clanStory.clanName}</p>
            <h2 className="gp-title mt-2 text-2xl md:text-3xl">
              {clanStory.heroCaption}
            </h2>
            <p className="gp-lede mt-2 max-w-lg text-sm">
              Gõ tên húy, thụy hoặc họ tên — cây phóng to tới đúng người. Double-click
              để xem tiểu sử và ngày giỗ âm lịch.
            </p>
          </div>
          <Link
            href="/tree/family-demo-nguyen"
            className="gp-btn gp-btn-secondary shrink-0"
          >
            Vào cây công khai
          </Link>
        </div>
      </section>
    </div>
  );
}
