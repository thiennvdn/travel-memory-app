export type Memory = {
  id: string;
  place: string;
  date: string; // dd/mm/yyyy
  note: string;
  color: string;
  latitude: number;
  longitude: number;
};

export const mockMemories: Memory[] = [
  {
    id: "1",
    place: "Đèo Hải Vân",
    date: "08/08/2026",
    note: "Bay dù lượn buổi sáng, gió nhẹ, view biển tuyệt đẹp.",
    color: "#1D9E75",
    latitude: 16.2136,
    longitude: 108.118,
  },
  {
    id: "2",
    place: "Hội An",
    date: "02/07/2026",
    note: "Đi bộ phố cổ buổi tối, mua vé đèn lồng thả sông.",
    color: "#D85A30",
    latitude: 15.8801,
    longitude: 108.338,
  },
  {
    id: "3",
    place: "Đà Lạt",
    date: "14/05/2026",
    note: "Ghi âm tiếng chợ đêm, se lạnh, mùi cà phê khắp phố.",
    color: "#BA7517",
    latitude: 11.9404,
    longitude: 108.4583,
  },
  {
    id: "4",
    place: "Phú Quốc",
    date: "21/03/2026",
    note: "Lặn ngắm san hô, nước trong xanh, gặp cá hề.",
    color: "#7F77DD",
    latitude: 10.2899,
    longitude: 103.984,
  },
];

export const mockStats = {
  provinces: 17,
  trips: 9,
  flightSpots: 5,
  memoriesSaved: 63,
};
