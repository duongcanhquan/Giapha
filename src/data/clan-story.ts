export type ClanMilestone = {
  id: string;
  year: string;
  title: string;
  body: string;
  side: "left" | "right";
};

export const clanStory = {
  clanName: "Nguyễn",
  hallName: "Nhà thờ họ Nguyễn",
  tagline: "Gìn giữ hương hỏa — kể lại gốc rễ cho thế hệ sau.",
  heroCaption: "Từ Thủy tổ đến cháu chất, mỗi đời là một mạch nối.",
  milestones: [
    {
      id: "ms1",
      year: "1880",
      title: "Thủy tổ dựng nghiệp",
      body: "Nguyễn Văn Tổ khai mở chi họ tại làng quê Bắc Bộ, dựng bàn thờ tổ và đặt lệ cúng giỗ đầu năm.",
      side: "left",
    },
    {
      id: "ms2",
      year: "1910",
      title: "Mở rộng chi nhánh",
      body: "Đời thứ hai giữ hương hỏa, mở mang đất đai và nối thêm các nhánh phụ trong cùng làng xã.",
      side: "right",
    },
    {
      id: "ms3",
      year: "1955",
      title: "Giữ lửa qua biến cố",
      body: "Gia tộc vượt qua thời kỳ biến động; sổ gia phả được chép lại, tên húy và tên thụy được lưu cẩn thận.",
      side: "left",
    },
    {
      id: "ms4",
      year: "1988",
      title: "Trùng tu nhà thờ họ",
      body: "Con cháu góp sức trùng tu nhà thờ, dựng lại nghi thức giỗ tổ và ngày họp mặt dòng họ.",
      side: "right",
    },
    {
      id: "ms5",
      year: "Nay",
      title: "Gia phả số",
      body: "Cây gia phả tương tác giúp thế hệ trẻ tìm đường về nguồn — từ Thủy tổ đến từng người.",
      side: "left",
    },
  ] satisfies ClanMilestone[],
};
