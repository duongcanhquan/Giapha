"use client";

import { motion } from "framer-motion";
import type { MilestoneIcon } from "@/data/clan-story";

type MilestoneArtProps = {
  icon: MilestoneIcon;
  title: string;
};

/**
 * Minh họa SVG sáng tạo theo từng cột mốc — ấm lacquer/gold, có motion nhẹ.
 */
export function MilestoneArt({ icon, title }: MilestoneArtProps) {
  return (
    <motion.div
      className="milestone-art"
      aria-hidden
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg
        viewBox="0 0 200 140"
        className="h-auto w-full max-w-[220px]"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`mg-${icon}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7a1f1f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b8952d" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`mg-soft-${icon}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#f7f4ec" />
            <stop offset="100%" stopColor="#e4e8e5" />
          </linearGradient>
        </defs>

        {/* Giấy cuộn nền */}
        <rect
          x="8"
          y="8"
          width="184"
          height="124"
          rx="14"
          fill={`url(#mg-soft-${icon})`}
          stroke="#7d6540"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <circle cx="28" cy="28" r="3" fill="#7a1f1f" opacity="0.55" />
        <circle cx="172" cy="112" r="3" fill="#b8952d" opacity="0.55" />

        {icon === "founder" ? <ArtFounder grad={`url(#mg-${icon})`} /> : null}
        {icon === "settle" ? <ArtSettle grad={`url(#mg-${icon})`} /> : null}
        {icon === "branches" ? <ArtBranches grad={`url(#mg-${icon})`} /> : null}
        {icon === "flame" ? <ArtFlame grad={`url(#mg-${icon})`} /> : null}
        {icon === "temple" ? <ArtTemple grad={`url(#mg-${icon})`} /> : null}
        {icon === "tree" ? <ArtTree grad={`url(#mg-${icon})`} /> : null}
      </svg>
    </motion.div>
  );
}

function ArtFounder({ grad }: { grad: string }) {
  return (
    <g>
      {/* Ấn son / bàn thờ stylized */}
      <motion.ellipse
        cx="100"
        cy="108"
        rx="48"
        ry="8"
        fill="#7d6540"
        opacity="0.2"
        initial={{ scaleX: 0.6 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
      <rect x="62" y="78" width="76" height="10" rx="2" fill={grad} />
      <rect x="70" y="58" width="60" height="22" rx="3" fill="#1a1410" opacity="0.85" />
      {/* Lư hương */}
      <path d="M90 58 V42 H110 V58" stroke={grad} strokeWidth="3" fill="none" />
      <motion.path
        d="M96 42 C94 30 100 22 100 22 C100 22 106 30 104 42"
        fill="#b8952d"
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: [0.45, 1, 0.45], y: [4, 0, 4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M102 42 C100 28 108 18 108 18 C108 18 114 30 110 42"
        fill="#7a1f1f"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      {/* Con dấu Thủy tổ */}
      <circle cx="148" cy="36" r="16" fill="#7a1f1f" />
      <text
        x="148"
        y="40"
        textAnchor="middle"
        fill="#fff8f0"
        fontSize="9"
        fontFamily="var(--font-literata), Literata, serif"
        fontWeight="600"
      >
        Tổ
      </text>
    </g>
  );
}

function ArtSettle({ grad }: { grad: string }) {
  return (
    <g>
      {/* Nhà ba gian stylized + ruộng */}
      <path d="M40 95 H160" stroke="#7d6540" strokeWidth="2" opacity="0.4" />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={48 + i * 28}
          y1="95"
          x2={40 + i * 28}
          y2="112"
          stroke="#2d6b48"
          strokeWidth="1.5"
          opacity="0.45"
        />
      ))}
      <motion.path
        d="M56 88 L100 48 L144 88 Z"
        fill={grad}
        initial={{ y: 8, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
      />
      <rect x="68" y="88" width="64" height="28" fill="#1a1410" opacity="0.8" />
      <rect x="90" y="96" width="16" height="20" fill="#f7f4ec" opacity="0.9" />
      <circle cx="52" cy="40" r="10" fill="#b8952d" opacity="0.35" />
    </g>
  );
}

function ArtBranches({ grad }: { grad: string }) {
  return (
    <g stroke={grad} strokeWidth="2.5" fill="none" strokeLinecap="round">
      <motion.path
        d="M100 110 V55"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      />
      <motion.path
        d="M100 70 C78 62 62 48 52 36"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.15 }}
      />
      <motion.path
        d="M100 70 C122 62 138 48 148 36"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.25 }}
      />
      <motion.path
        d="M100 85 C70 90 55 100 42 108"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.35 }}
      />
      <motion.path
        d="M100 85 C130 90 145 100 158 108"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.4 }}
      />
      {[
        [100, 50],
        [52, 36],
        [148, 36],
        [42, 108],
        [158, 108],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="6"
          fill="#7a1f1f"
          stroke="none"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45 + i * 0.06, type: "spring", stiffness: 260 }}
        />
      ))}
    </g>
  );
}

function ArtFlame({ grad }: { grad: string }) {
  return (
    <g>
      <ellipse cx="100" cy="108" rx="36" ry="7" fill="#7d6540" opacity="0.2" />
      <rect x="88" y="88" width="24" height="16" rx="3" fill="#1a1410" opacity="0.75" />
      <motion.path
        d="M100 88 C88 72 92 52 100 40 C108 52 112 72 100 88 Z"
        fill={grad}
        animate={{
          scaleY: [1, 1.08, 0.96, 1],
          originY: 1,
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 88px" }}
      />
      <motion.path
        d="M100 82 C94 72 96 60 100 52 C104 60 106 72 100 82 Z"
        fill="#f7f4ec"
        opacity="0.85"
        animate={{ opacity: [0.55, 0.95, 0.55] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Tia sáng giữ lửa */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={70 + i * 30}
          cy={48}
          r="2"
          fill="#b8952d"
          animate={{ y: [0, -10, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </g>
  );
}

function ArtTemple({ grad }: { grad: string }) {
  return (
    <g>
      <ellipse cx="100" cy="112" rx="50" ry="8" fill="#7d6540" opacity="0.18" />
      {/* Mái cong đình/chùa stylized */}
      <motion.path
        d="M36 70 Q100 28 164 70 L148 70 Q100 48 52 70 Z"
        fill={grad}
        initial={{ y: 10, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
      <rect x="58" y="70" width="84" height="36" fill="#1a1410" opacity="0.82" />
      <rect x="90" y="82" width="20" height="24" fill="#f7f4ec" opacity="0.85" />
      <path d="M58 70 H142" stroke="#b8952d" strokeWidth="2" />
      {/* Cột */}
      <rect x="68" y="70" width="5" height="36" fill="#b8952d" opacity="0.5" />
      <rect x="127" y="70" width="5" height="36" fill="#b8952d" opacity="0.5" />
      <motion.circle
        cx="100"
        cy="42"
        r="5"
        fill="#7a1f1f"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
    </g>
  );
}

function ArtTree({ grad }: { grad: string }) {
  return (
    <g>
      <ellipse cx="100" cy="112" rx="44" ry="7" fill="#7d6540" opacity="0.18" />
      {/* Màn hình / khung số + cây */}
      <rect
        x="48"
        y="28"
        width="104"
        height="72"
        rx="8"
        fill="#1a1410"
        opacity="0.88"
      />
      <rect x="54" y="34" width="92" height="52" rx="4" fill="#f7f4ec" />
      <g stroke={grad} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M100 78 V52" />
        <path d="M100 60 L78 48" />
        <path d="M100 60 L122 48" />
        <path d="M100 68 L84 72" />
        <path d="M100 68 L116 72" />
      </g>
      {[
        [100, 50],
        [78, 48],
        [122, 48],
        [84, 72],
        [116, 72],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="4.5"
          fill={i === 0 ? "#7a1f1f" : "#2d6b48"}
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.08, type: "spring" }}
        />
      ))}
      <motion.rect
        x="88"
        y="98"
        width="24"
        height="6"
        rx="2"
        fill={grad}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </g>
  );
}
