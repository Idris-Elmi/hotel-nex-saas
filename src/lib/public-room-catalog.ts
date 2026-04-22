export type PublicRoomCatalogItem = {
  id: string;
  name: string;
  type: string;
  shortDescription: string;
  description: string;
  amenities: string[];
  pricing: {
    bedOnly: number;
    bedBreakfast: number;
  };
  sampleImages: string[];
};

const hotelRoomPhoto1 = "/images/room1.jpg";
const hotelRoomPhoto2 = "/images/room2.jpg";
const hotelRoomPhoto3 = "/images/room3.jpg";

export const publicRoomCatalog: PublicRoomCatalogItem[] = [
  {
    id: "deluxe-city-view",
    name: "Deluxe City View",
    type: "Deluxe",
    shortDescription: "Bright room with skyline windows and workspace.",
    description:
      "A modern deluxe room designed for business and leisure guests who want comfort, natural light, and a quiet work corner.",
    amenities: ["King bed", "Rain shower", "Smart TV", "High-speed Wi-Fi", "Work desk"],
    pricing: {
      bedOnly: 140,
      bedBreakfast: 170,
    },
    sampleImages: [hotelRoomPhoto1, hotelRoomPhoto2],
  },
  {
    id: "executive-suite",
    name: "Executive Suite",
    type: "Suite",
    shortDescription: "Spacious suite with separate lounge area.",
    description:
      "A premium suite with generous living space and upgraded amenities for longer stays, family travel, or executive trips.",
    amenities: ["Super king bed", "Lounge space", "Coffee station", "Bathtub", "Premium toiletries"],
    pricing: {
      bedOnly: 220,
      bedBreakfast: 265,
    },
    sampleImages: [hotelRoomPhoto2, hotelRoomPhoto1],
  },
  {
    id: "family-comfort",
    name: "Family Comfort",
    type: "Family",
    shortDescription: "Flexible bedding and kid-friendly setup.",
    description:
      "A practical family room with adaptable bed configuration, comfortable seating, and storage for multi-guest stays.",
    amenities: ["Twin + queen options", "Mini fridge", "Extra storage", "Connecting room option", "Kids welcome kit"],
    pricing: {
      bedOnly: 180,
      bedBreakfast: 225,
    },
    sampleImages: [hotelRoomPhoto3, hotelRoomPhoto2],
  },
];
