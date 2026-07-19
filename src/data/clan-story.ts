export type MilestoneIcon =
  | "founder"
  | "settle"
  | "branches"
  | "flame"
  | "temple"
  | "tree";

export type ClanMilestone = {
  id: string;
  /** Nhãn đời / giai đoạn — ví dụ “Đời 1”, “Đời 2” */
  era: string;
  title: string;
  body: string;
  side: "left" | "right";
  icon: MilestoneIcon;
};

/** Cột mốc mẫu — hành trình hương hỏa điển hình (không gắn họ cụ thể) */
export const clanStory = {
  tagline:
    "Gìn giữ hương hỏa — mỗi gia đình một gia phả riêng, chỉ người trong nhà mới vào được.",
  heroCaption: "Đăng nhập để về đúng nhà mình. Chưa có? Đăng ký để mở sổ gia phả.",
  milestones: [
    {
      id: "ms1",
      era: "Đời 1",
      title: "Thủy tổ",
      body: "Người đứng đầu dòng họ dựng bàn thờ, đặt lệ giỗ đầu xuân và ghi tên húy — mở mạch hương hỏa cho các đời sau.",
      side: "left",
      icon: "founder",
    },
    {
      id: "ms2",
      era: "Đời 2",
      title: "Lập nghiệp",
      body: "Con cháu khai phá đất đai, dựng nhà cửa, giữ chữ tín trong làng xã — nền tảng vững để nuôi dưỡng chi họ.",
      side: "right",
      icon: "settle",
    },
    {
      id: "ms3",
      era: "Đời 3–4",
      title: "Mở rộng chi nhánh",
      body: "Các chi phụ tách ra nhưng vẫn cùng một Thủy tổ. Trên cây gia phả, mỗi nhánh là một cành xanh nối về gốc.",
      side: "left",
      icon: "branches",
    },
    {
      id: "ms4",
      era: "Thời biến",
      title: "Giữ lửa qua biến cố",
      body: "Dù thăng trầm, sổ gia phả được chép lại, tên thụy được lưu — ngọn lửa hương hỏa không tắt.",
      side: "right",
      icon: "flame",
    },
    {
      id: "ms5",
      era: "Trùng tu",
      title: "Nhà thờ & họp họ",
      body: "Con cháu góp sức trùng tu nhà thờ họ, họp mặt đầu năm — nơi kể chuyện tổ tiên cho thế hệ trẻ.",
      side: "left",
      icon: "temple",
    },
    {
      id: "ms6",
      era: "Hôm nay",
      title: "Gia phả số",
      body: "Đăng nhập là vào đúng sổ nhà mình. Tìm tên húy/thụy trên cây, gửi link cho họ hàng khi cần, xuất bản đồ in ấn — hương hỏa bước sang thời đại số.",
      side: "right",
      icon: "tree",
    },
  ] satisfies ClanMilestone[],
};
