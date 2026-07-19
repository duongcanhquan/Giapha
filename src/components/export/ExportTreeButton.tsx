"use client";

import { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { FamilyTree, type FamilyTreeHandle } from "@/components/family-tree";
import type { FamilyTreeData } from "@/types/genealogy";

type ExportTreeButtonProps = {
  data: FamilyTreeData;
  /** Nhãn nút */
  label?: string;
  className?: string;
  fileName?: string;
};

/** A0 landscape mm */
const A0_WIDTH_MM = 1189;
const A0_HEIGHT_MM = 841;

/** Pixel staging size ~ 150 DPI cho A0 ngang (chất lượng in ấn) */
const STAGE_WIDTH_PX = Math.round((A0_WIDTH_MM / 25.4) * 150);
const STAGE_HEIGHT_PX = Math.round((A0_HEIGHT_MM / 25.4) * 150);

export function ExportTreeButton({
  data,
  label = "Xuất PDF A0",
  className,
  fileName,
}: ExportTreeButtonProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<FamilyTreeHandle>(null);
  const [exporting, setExporting] = useState(false);
  const [stageReady, setStageReady] = useState(false);

  const ensureStage = useCallback(() => {
    setStageReady(true);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setStageReady(true);

    try {
      // Đợi clone mount + React Flow đo layout
      await new Promise((r) => setTimeout(r, 80));
      treeRef.current?.fitView();
      await new Promise((r) => setTimeout(r, 420));

      const node = stageRef.current;
      if (!node) throw new Error("Không tìm thấy khung xuất cây.");

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fffdf8",
        width: STAGE_WIDTH_PX,
        height: STAGE_HEIGHT_PX,
        windowWidth: STAGE_WIDTH_PX,
        windowHeight: STAGE_HEIGHT_PX,
        logging: false,
      });

      const img = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a0",
        compress: true,
      });

      pdf.addImage(img, "PNG", 0, 0, A0_WIDTH_MM, A0_HEIGHT_MM, undefined, "FAST");
      const name =
        fileName ??
        `giapha-${data.clan_name.toLowerCase()}-a0-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(name);
    } catch (error) {
      console.error(error);
      alert("Xuất PDF thất bại. Thử lại sau khi cây đã tải xong.");
    } finally {
      setExporting(false);
    }
  }, [data.clan_name, fileName]);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={exporting}
        onMouseEnter={ensureStage}
        onFocus={ensureStage}
        onClick={() => void handleExport()}
      >
        {exporting ? "Đang xuất PDF…" : label}
      </button>

      {/* Staging clone — offscreen, không hiện control UI */}
      {stageReady ? (
        <div
          aria-hidden
          className="pointer-events-none fixed -left-[200vw] top-0 overflow-hidden"
          style={{ width: STAGE_WIDTH_PX, height: STAGE_HEIGHT_PX }}
        >
          <div
            ref={stageRef}
            className="ft-export-stage"
            style={{
              width: STAGE_WIDTH_PX,
              height: STAGE_HEIGHT_PX,
              background: "#fffdf8",
            }}
          >
            <div className="ft-export-title">
              <p>Gia phả dòng họ {data.clan_name}</p>
              <span>Khổ in A0 · Bản đồ quan hệ</span>
            </div>
            <FamilyTree
              ref={treeRef}
              data={data}
              showToolbar={false}
              showMiniMap={false}
              showControls={false}
              showBackground={false}
              interactive={false}
              className="ft-export-tree"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
