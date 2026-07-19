"use client";

import { useState, type CSSProperties } from "react";
import { Link2, Check } from "lucide-react";
import { appToast } from "@/lib/toast";

type CopyShareLinkButtonProps = {
  url: string;
  className?: string;
  style?: CSSProperties;
  label?: string;
};

export function CopyShareLinkButton({
  url,
  className,
  style,
  label = "Copy Link Chia sẻ",
}: CopyShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      appToast.success("Đã copy link", "Gửi qua Zalo / Facebook để chia sẻ cây.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      appToast.success("Đã copy link");
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={className}
      style={style}
      title="Sao chép link để gửi Zalo / Facebook"
    >
      {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
      {label ? <span>{copied ? "Đã copy!" : label}</span> : null}
    </button>
  );
}
