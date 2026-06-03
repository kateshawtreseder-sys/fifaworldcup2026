// 48 teams for the FIFA World Cup 2026, split into 12 groups (A–L) of 4.
//
// NOTE: This is a representative line-up to get the app working end-to-end.
// The real groups can be edited here (or via the database) once the official
// draw is confirmed — fifaCode, name, groupName and flagEmoji are all that
// matter. Hosts (CAN, MEX, USA) are included.

export type SeedTeam = {
  fifaCode: string;
  name: string;
  groupName: string;
  flagEmoji: string;
};

export const SEED_TEAMS: SeedTeam[] = [
  // Group A
  { fifaCode: "MEX", name: "Mexico", groupName: "A", flagEmoji: "🇲🇽" },
  { fifaCode: "CRO", name: "Croatia", groupName: "A", flagEmoji: "🇭🇷" },
  { fifaCode: "ECU", name: "Ecuador", groupName: "A", flagEmoji: "🇪🇨" },
  { fifaCode: "QAT", name: "Qatar", groupName: "A", flagEmoji: "🇶🇦" },
  // Group B
  { fifaCode: "CAN", name: "Canada", groupName: "B", flagEmoji: "🇨🇦" },
  { fifaCode: "BEL", name: "Belgium", groupName: "B", flagEmoji: "🇧🇪" },
  { fifaCode: "KOR", name: "South Korea", groupName: "B", flagEmoji: "🇰🇷" },
  { fifaCode: "EGY", name: "Egypt", groupName: "B", flagEmoji: "🇪🇬" },
  // Group C
  { fifaCode: "USA", name: "United States", groupName: "C", flagEmoji: "🇺🇸" },
  { fifaCode: "URU", name: "Uruguay", groupName: "C", flagEmoji: "🇺🇾" },
  { fifaCode: "JPN", name: "Japan", groupName: "C", flagEmoji: "🇯🇵" },
  { fifaCode: "GHA", name: "Ghana", groupName: "C", flagEmoji: "🇬🇭" },
  // Group D
  { fifaCode: "ARG", name: "Argentina", groupName: "D", flagEmoji: "🇦🇷" },
  { fifaCode: "POL", name: "Poland", groupName: "D", flagEmoji: "🇵🇱" },
  { fifaCode: "AUS", name: "Australia", groupName: "D", flagEmoji: "🇦🇺" },
  { fifaCode: "CIV", name: "Ivory Coast", groupName: "D", flagEmoji: "🇨🇮" },
  // Group E
  { fifaCode: "FRA", name: "France", groupName: "E", flagEmoji: "🇫🇷" },
  { fifaCode: "SEN", name: "Senegal", groupName: "E", flagEmoji: "🇸🇳" },
  { fifaCode: "MAR", name: "Morocco", groupName: "E", flagEmoji: "🇲🇦" },
  { fifaCode: "NZL", name: "New Zealand", groupName: "E", flagEmoji: "🇳🇿" },
  // Group F
  { fifaCode: "ENG", name: "England", groupName: "F", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { fifaCode: "COL", name: "Colombia", groupName: "F", flagEmoji: "🇨🇴" },
  { fifaCode: "IRN", name: "Iran", groupName: "F", flagEmoji: "🇮🇷" },
  { fifaCode: "PAN", name: "Panama", groupName: "F", flagEmoji: "🇵🇦" },
  // Group G
  { fifaCode: "BRA", name: "Brazil", groupName: "G", flagEmoji: "🇧🇷" },
  { fifaCode: "SUI", name: "Switzerland", groupName: "G", flagEmoji: "🇨🇭" },
  { fifaCode: "NGA", name: "Nigeria", groupName: "G", flagEmoji: "🇳🇬" },
  { fifaCode: "KSA", name: "Saudi Arabia", groupName: "G", flagEmoji: "🇸🇦" },
  // Group H
  { fifaCode: "ESP", name: "Spain", groupName: "H", flagEmoji: "🇪🇸" },
  { fifaCode: "DEN", name: "Denmark", groupName: "H", flagEmoji: "🇩🇰" },
  { fifaCode: "TUN", name: "Tunisia", groupName: "H", flagEmoji: "🇹🇳" },
  { fifaCode: "CRC", name: "Costa Rica", groupName: "H", flagEmoji: "🇨🇷" },
  // Group I
  { fifaCode: "POR", name: "Portugal", groupName: "I", flagEmoji: "🇵🇹" },
  { fifaCode: "SRB", name: "Serbia", groupName: "I", flagEmoji: "🇷🇸" },
  { fifaCode: "CMR", name: "Cameroon", groupName: "I", flagEmoji: "🇨🇲" },
  { fifaCode: "JAM", name: "Jamaica", groupName: "I", flagEmoji: "🇯🇲" },
  // Group J
  { fifaCode: "GER", name: "Germany", groupName: "J", flagEmoji: "🇩🇪" },
  { fifaCode: "NED", name: "Netherlands", groupName: "J", flagEmoji: "🇳🇱" },
  { fifaCode: "ALG", name: "Algeria", groupName: "J", flagEmoji: "🇩🇿" },
  { fifaCode: "HON", name: "Honduras", groupName: "J", flagEmoji: "🇭🇳" },
  // Group K
  { fifaCode: "ITA", name: "Italy", groupName: "K", flagEmoji: "🇮🇹" },
  { fifaCode: "MLI", name: "Mali", groupName: "K", flagEmoji: "🇲🇱" },
  { fifaCode: "PER", name: "Peru", groupName: "K", flagEmoji: "🇵🇪" },
  { fifaCode: "UZB", name: "Uzbekistan", groupName: "K", flagEmoji: "🇺🇿" },
  // Group L
  { fifaCode: "NOR", name: "Norway", groupName: "L", flagEmoji: "🇳🇴" },
  { fifaCode: "AUT", name: "Austria", groupName: "L", flagEmoji: "🇦🇹" },
  { fifaCode: "PAR", name: "Paraguay", groupName: "L", flagEmoji: "🇵🇾" },
  { fifaCode: "RSA", name: "South Africa", groupName: "L", flagEmoji: "🇿🇦" },
];
