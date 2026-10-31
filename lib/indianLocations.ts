import { State, City } from "country-state-city";

export interface IndianState {
  code: string;
  name: string;
}

export const GST_STATE_CODE_MAP: Record<string, string> = {
  "01": "01", "JAMMU AND KASHMIR": "01", "JAMMU & KASHMIR": "01", "J&K": "01", "JK": "01",
  "02": "02", "HIMACHAL PRADESH": "02", "HP": "02",
  "03": "03", "PUNJAB": "03", "PB": "03",
  "04": "04", "CHANDIGARH": "04", "CH": "04",
  "05": "05", "UTTARAKHAND": "05", "UK": "05", "UTTARANCHAL": "05",
  "06": "06", "HARYANA": "06", "HR": "06",
  "07": "07", "DELHI": "07", "NEW DELHI": "07", "DL": "07",
  "08": "08", "RAJASTHAN": "08", "RJ": "08",
  "09": "09", "UTTAR PRADESH": "09", "UP": "09",
  "10": "10", "BIHAR": "10", "BR": "10",
  "11": "11", "SIKKIM": "11", "SK": "11",
  "12": "12", "ARUNACHAL PRADESH": "12", "AR": "12",
  "13": "13", "NAGALAND": "13", "NL": "13",
  "14": "14", "MANIPUR": "14", "MN": "14",
  "15": "15", "MIZORAM": "15", "MZ": "15",
  "16": "16", "TRIPURA": "16", "TR": "16",
  "17": "17", "MEGHALAYA": "17", "ML": "17",
  "18": "18", "ASSAM": "18", "AS": "18",
  "19": "19", "WEST BENGAL": "19", "W BENGAL": "19", "W. BENGAL": "19", "WESTBENGAL": "19", "WB": "19",
  "20": "20", "JHARKHAND": "20", "JH": "20",
  "21": "21", "ODISHA": "21", "ORISSA": "21", "OD": "21", "OR": "21",
  "22": "22", "CHHATTISGARH": "22", "CG": "22", "CT": "22",
  "23": "23", "MADHYA PRADESH": "23", "MP": "23",
  "24": "24", "GUJARAT": "24", "GJ": "24",
  "25": "25", "DAMAN AND DIU": "25", "DAMAN & DIU": "25", "DD": "25",
  "26": "26", "DADRA AND NAGAR HAVELI": "26", "DN": "26",
  "27": "27", "MAHARASHTRA": "27", "MH": "27",
  "28": "28", "ANDHRA PRADESH (OLD)": "28",
  "29": "29", "KARNATAKA": "29", "KA": "29",
  "30": "30", "GOA": "30", "GA": "30",
  "31": "31", "LAKSHADWEEP": "31", "LD": "31",
  "32": "32", "KERALA": "32", "KL": "32",
  "33": "33", "TAMIL NADU": "33", "TAMILNADU": "33", "TN": "33",
  "34": "34", "PUDUCHERRY": "34", "PONDICHERRY": "34", "PY": "34",
  "35": "35", "ANDAMAN AND NICOBAR ISLANDS": "35", "ANDAMAN & NICOBAR": "35", "AN": "35",
  "36": "36", "TELANGANA": "36", "TS": "36", "TG": "36",
  "37": "37", "ANDHRA PRADESH": "37", "AP": "37",
  "38": "38", "LADAKH": "38", "LA": "38"
};

const REVERSE_STATE_NAMES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh"
};

export function getGstStateDetails(stateName?: string, gstin?: string): { name: string; code: string; formatted: string } {
  let code = "";
  let name = stateName?.trim() || "";

  // 1. Try extraction from GSTIN prefix if valid 2-digit number
  if (gstin && gstin.trim().length >= 2) {
    const prefix = gstin.trim().substring(0, 2);
    if (/^\d{2}$/.test(prefix) && REVERSE_STATE_NAMES[prefix]) {
      code = prefix;
      if (!name) {
        name = REVERSE_STATE_NAMES[prefix];
      }
    }
  }

  // 2. Lookup by State Name if code not resolved yet
  if (!code && name) {
    const normalized = name.toUpperCase();
    if (GST_STATE_CODE_MAP[normalized]) {
      code = GST_STATE_CODE_MAP[normalized];
    }
  }

  // Fallback defaults if still unresolved
  if (!name) name = "West Bengal";
  if (!code) {
    const normalized = name.toUpperCase();
    code = GST_STATE_CODE_MAP[normalized] || "19";
  }

  return {
    name,
    code,
    formatted: `${name} (${code})`,
  };
}

export function getIndianStates(): IndianState[] {
  const states = State.getStatesOfCountry("IN");
  return states.map((s) => ({
    code: s.isoCode,
    name: s.name,
  }));
}

export function getCitiesOfIndianState(stateCodeOrName: string): string[] {
  if (!stateCodeOrName) return [];
  const states = State.getStatesOfCountry("IN");
  
  // Find state by isoCode or name
  const matchedState = states.find(
    (s) =>
      s.isoCode.toUpperCase() === stateCodeOrName.toUpperCase() ||
      s.name.toLowerCase() === stateCodeOrName.toLowerCase()
  );

  if (!matchedState) return [];

  const cities = City.getCitiesOfState("IN", matchedState.isoCode);
  return cities.map((c) => c.name);
}
