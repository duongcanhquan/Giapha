export type ClanMilestone = {
  id: string;
  year: string;
  title: string;
  body: string;
  side: "left" | "right";
};

/** Nội dung landing — văn hoá hương hỏa chung, không gắn dòng họ mẫu */
export const clanStory = {
  tagline:
    "Gìn giữ hương hỏa — mỗi gia đình một gia phả riêng, chỉ người trong nhà mới vào được.",
  heroCaption: "Đăng nhập để về đúng nhà mình. Chưa có? Đăng ký để mở sổ gia phả.",
  milestones: [
    {
      id: "ms1",
      year: "Gốc rễ",
      title: "Thờ phụng tổ tiên",
      body: "Bàn thờ, ngày giỗ âm lịch và tên húy — tên thụy là mạch nối các đời. Giapha giúp lưu giữ trang trọng trên nền số.",
      side: "left",
    },
    {
      id: "ms2",
      year: "Riêng tư",
      title: "Gia phả của từng nhà",
      body: "Không dùng bản demo chung. Ai đăng nhập sẽ vào đúng dòng họ mình quản trị; khách xem qua link chia sẻ riêng.",
      side: "right",
    },
    {
      id: "ms3",
      year: "Tra cứu",
      title: "Tìm người trong nháy mắt",
      body: "Gõ tên, tên húy hay thụy — cây phóng tới đúng người. Phù hợp khi họp họ, cúng giỗ hay dạy con cháu về nguồn cội.",
      side: "left",
    },
    {
      id: "ms4",
      year: "Chia sẻ",
      title: "Copy link gửi trong họ",
      body: "Chủ dòng họ copy link cây công khai và gửi Zalo / Facebook. Người nhận chỉ xem; không sửa được sổ của bạn.",
      side: "right",
    },
    {
      id: "ms5",
      year: "In ấn",
      title: "Xuất infographic A0",
      body: "Khi cần treo nhà thờ họ hoặc họp mặt lớn, xuất bản đồ quan hệ khổ lớn để in offline.",
      side: "left",
    },
  ] satisfies ClanMilestone[],
};
