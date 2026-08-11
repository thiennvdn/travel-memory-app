export type Memory = {
  id: string;
  place: string;
  date: string; // dd/mm/yyyy
  note: string;
  color: string;
  // Vị trí tương đối trên khung bản đồ demo (0-1). Sẽ thay bằng lat/lng thật khi nối bản đồ thực.
  x: number;
  y: number;
};

export const mockMemories: Memory[] = [
  {
    id: "1",
    place: "Đèo Hải Vân",
    date: "08/08/2026",
    note: "Bay dù lượn buổi sáng, gió nhẹ, view biển tuyệt đẹp.",
    color: "#1D9E75",
    x: 0.18,
    y: 0.18,
  },
  {
    id: "2",
    place: "Hội An",
    date: "02/07/2026",
    note: "Đi bộ phố cổ buổi tối, mua vé đèn lồng thả sông.",
    color: "#D85A30",
    x: 0.6,
    y: 0.32,
  },
  {
    id: "3",
    place: "Đà Lạt",
    date: "14/05/2026",
    note: "Ghi âm tiếng chợ đêm, se lạnh, mùi cà phê khắp phố.",
    color: "#BA7517",
    x: 0.35,
    y: 0.5,
  },
  {
    id: "4",
    place: "Phú Quốc",
    date: "21/03/2026",
    note: "Lặn ngắm san hô, nước trong xanh, gặp cá hề.",
    color: "#7F77DD",
    x: 0.72,
    y: 0.68,
  },
];

export const mockStats = {
  provinces: 17,
  trips: 9,
  flightSpots: 5,
  memoriesSaved: 63,
};
