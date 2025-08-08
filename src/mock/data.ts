import type { VehicleType, VehicleMaker, VehicleModel, FeatureCategory, FeatureType, Customer, QuotationCreated, ID } from "@/types";

export const vehicleTypes: VehicleType[] = [
  { id: 1, code: "lcv", name: "LCV" },
  { id: 2, code: "hcv", name: "HCV" },
];

export const vehicleMakers: VehicleMaker[] = [
  { id: 1, name: "Tata" },
  { id: 2, name: "Mahindra" },
  { id: 3, name: "Ashok Leyland" },
];

export const vehicleModels: VehicleModel[] = [
  { id: 1, makerId: 1, typeId: 1, name: "Ace" },
  { id: 2, makerId: 1, typeId: 1, name: "Intra" },
  { id: 3, makerId: 2, typeId: 1, name: "Jeeto" },
  { id: 4, makerId: 3, typeId: 2, name: "Boss" },
];

// Categories (main and sub)
export const categories: FeatureCategory[] = [
  { id: 10, name: "Front Section" },
  { id: 11, name: "Front Bumper", parentId: 10 },
  { id: 12, name: "Front Mirror Arm", parentId: 10 },
  { id: 13, name: "Front Sheet", parentId: 10 },

  { id: 20, name: "Carrier" },
  { id: 21, name: "Fixed", parentId: 20 },
  { id: 22, name: "Detachable", parentId: 20 },

  { id: 30, name: "Rear Section" },
  { id: 31, name: "Rear Bumper", parentId: 30 },
  { id: 32, name: "Rear Doors", parentId: 30 },
  { id: 33, name: "Sheet for Rear Tailgate", parentId: 30 },
  { id: 34, name: "Hooks and Chains for Tailgate", parentId: 30 },
  { id: 35, name: "Height Increase - Rear Tailgate", parentId: 30 },
  { id: 36, name: "Number Plate", parentId: 30 },
  { id: 37, name: "Plain", parentId: 36 },
  { id: 38, name: "Hanging", parentId: 36 },
  { id: 39, name: "Taillamp Grill", parentId: 30 },

  { id: 40, name: "Side Section" },
  { id: 41, name: "Side Patra", parentId: 40 },
  { id: 42, name: "Sheet for Side Gates", parentId: 40 },
  { id: 43, name: "L-angle for Tailgate", parentId: 40 },
  { id: 44, name: "Battery Box", parentId: 40 },
  { id: 45, name: "Ladder", parentId: 40 },

  { id: 50, name: "Inside Cargo Body" },
  { id: 51, name: "GI Sheet for Front", parentId: 50 },
  { id: 52, name: "GI Sheet for Floor", parentId: 50 },
  { id: 53, name: "Sheet for Side Gates", parentId: 50 },
  { id: 54, name: "Pipe for Steel Loading", parentId: 50 },
  { id: 55, name: "Center Pipe", parentId: 50 },

  { id: 60, name: "On Chassis / Underbody" },
  { id: 61, name: "Stepney Bracket", parentId: 60 },
  { id: 62, name: "C-channel Support", parentId: 60 },
  { id: 63, name: "Double Sakhali", parentId: 60 },

  { id: 70, name: "Accessories" },
  { id: 71, name: "Mirror Chrome Cover", parentId: 70 },
  { id: 72, name: "Door Visor", parentId: 70 },
  { id: 73, name: "Wheel Cap", parentId: 70 },
  { id: 74, name: "Door Handle Cover", parentId: 70 },
  { id: 75, name: "Radium", parentId: 70 },
  { id: 76, name: "Painting", parentId: 70 },
];

export const featureTypes: FeatureType[] = [
  // Provide a few sample types per leaf category
  { id: 1001, categoryId: 11, name: "Standard Bumper", base_cost: 2500 },
  { id: 1002, categoryId: 11, name: "Reinforced Bumper", base_cost: 4200 },

  { id: 1010, categoryId: 21, name: "Fixed Carrier - Light", base_cost: 3500 },
  { id: 1011, categoryId: 21, name: "Fixed Carrier - Heavy", base_cost: 5200 },
  { id: 1012, categoryId: 22, name: "Detachable Carrier - Quick Lock", base_cost: 5600 },

  { id: 1020, categoryId: 31, name: "Rear Bumper Standard", base_cost: 3000 },
  { id: 1021, categoryId: 39, name: "Taillamp Grill Steel", base_cost: 1800 },
  { id: 1022, categoryId: 37, name: "Number Plate Plain", base_cost: 300 },
  { id: 1023, categoryId: 38, name: "Number Plate Hanging", base_cost: 450 },

  { id: 1030, categoryId: 41, name: "Side Patra 1.2mm", base_cost: 2200 },
  { id: 1031, categoryId: 42, name: "Side Gate Sheet 1.0mm", base_cost: 2600 },

  { id: 1040, categoryId: 51, name: "GI Sheet Front 1.0mm", base_cost: 2400 },
  { id: 1041, categoryId: 52, name: "GI Sheet Floor 1.2mm", base_cost: 3600 },

  { id: 1050, categoryId: 61, name: "Stepney Bracket Std", base_cost: 1500 },
  { id: 1051, categoryId: 62, name: "C-channel Support Pair", base_cost: 2800 },

  { id: 1060, categoryId: 71, name: "Chrome Mirror Set", base_cost: 900 },
  { id: 1061, categoryId: 72, name: "Door Visor Smoke", base_cost: 700 },
  { id: 1062, categoryId: 73, name: "Wheel Cap Set", base_cost: 1200 },
  { id: 1063, categoryId: 76, name: "Full Body Paint", base_cost: 6500 },
];

export const customers: Customer[] = [
  { id: "c1", name: "Rahul Sharma", phone: "9999999999", whatsapp: "9999999999", email: "rahul@example.com", address: "Pune" },
  { id: "c2", name: "Anita Desai", phone: "8888888888", email: "anita@example.com", address: "Mumbai" },
];

export function getMakerModels(makerId: number) {
  return vehicleModels.filter((m) => m.makerId === makerId)
}

export function getTypeMakers(typeId: number) {
  const makerIds = new Set(vehicleModels.filter((m) => m.typeId === typeId).map((m) => m.makerId))
  return vehicleMakers.filter((mk) => makerIds.has(mk.id))
}

// LocalStorage helpers for quotations
const QUOTES_KEY = "nk:quotes";

export function saveQuotation(q: QuotationCreated) {
  const arr: QuotationCreated[] = JSON.parse(localStorage.getItem(QUOTES_KEY) || "[]");
  arr.unshift(q);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(arr));
}

export function getQuotation(id: ID): QuotationCreated | undefined {
  const arr: QuotationCreated[] = JSON.parse(localStorage.getItem(QUOTES_KEY) || "[]");
  return arr.find((x) => x.id === id);
}

export function listQuotations(): QuotationCreated[] {
  return JSON.parse(localStorage.getItem(QUOTES_KEY) || "[]");
}
