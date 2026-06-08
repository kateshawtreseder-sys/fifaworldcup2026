// The official 48 teams for the FIFA World Cup 2026, in their drawn groups
// (final draw, 5 December 2025). Source: openfootball public-domain data.
//
// If anything needs correcting, just edit the name / groupName / flagEmoji here
// and have the organiser tap "Load teams" again.

export type SeedTeam = {
  fifaCode: string;
  name: string;
  groupName: string;
  flagEmoji: string;
};

export const SEED_TEAMS: SeedTeam[] = [
  // Group A
  { fifaCode: "MEX", name: "Mexico", groupName: "A", flagEmoji: "🇲🇽" },
  { fifaCode: "RSA", name: "South Africa", groupName: "A", flagEmoji: "🇿🇦" },
  { fifaCode: "KOR", name: "South Korea", groupName: "A", flagEmoji: "🇰🇷" },
  { fifaCode: "CZE", name: "Czech Republic", groupName: "A", flagEmoji: "🇨🇿" },
  // Group B
  { fifaCode: "CAN", name: "Canada", groupName: "B", flagEmoji: "🇨🇦" },
  { fifaCode: "BIH", name: "Bosnia & Herzegovina", groupName: "B", flagEmoji: "🇧🇦" },
  { fifaCode: "QAT", name: "Qatar", groupName: "B", flagEmoji: "🇶🇦" },
  { fifaCode: "SUI", name: "Switzerland", groupName: "B", flagEmoji: "🇨🇭" },
  // Group C
  { fifaCode: "BRA", name: "Brazil", groupName: "C", flagEmoji: "🇧🇷" },
  { fifaCode: "MAR", name: "Morocco", groupName: "C", flagEmoji: "🇲🇦" },
  { fifaCode: "HAI", name: "Haiti", groupName: "C", flagEmoji: "🇭🇹" },
  { fifaCode: "SCO", name: "Scotland", groupName: "C", flagEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  // Group D
  { fifaCode: "USA", name: "United States", groupName: "D", flagEmoji: "🇺🇸" },
  { fifaCode: "PAR", name: "Paraguay", groupName: "D", flagEmoji: "🇵🇾" },
  { fifaCode: "AUS", name: "Australia", groupName: "D", flagEmoji: "🇦🇺" },
  { fifaCode: "TUR", name: "Turkey", groupName: "D", flagEmoji: "🇹🇷" },
  // Group E
  { fifaCode: "GER", name: "Germany", groupName: "E", flagEmoji: "🇩🇪" },
  { fifaCode: "CUW", name: "Curaçao", groupName: "E", flagEmoji: "🇨🇼" },
  { fifaCode: "CIV", name: "Ivory Coast", groupName: "E", flagEmoji: "🇨🇮" },
  { fifaCode: "ECU", name: "Ecuador", groupName: "E", flagEmoji: "🇪🇨" },
  // Group F
  { fifaCode: "NED", name: "Netherlands", groupName: "F", flagEmoji: "🇳🇱" },
  { fifaCode: "JPN", name: "Japan", groupName: "F", flagEmoji: "🇯🇵" },
  { fifaCode: "SWE", name: "Sweden", groupName: "F", flagEmoji: "🇸🇪" },
  { fifaCode: "TUN", name: "Tunisia", groupName: "F", flagEmoji: "🇹🇳" },
  // Group G
  { fifaCode: "BEL", name: "Belgium", groupName: "G", flagEmoji: "🇧🇪" },
  { fifaCode: "EGY", name: "Egypt", groupName: "G", flagEmoji: "🇪🇬" },
  { fifaCode: "IRN", name: "Iran", groupName: "G", flagEmoji: "🇮🇷" },
  { fifaCode: "NZL", name: "New Zealand", groupName: "G", flagEmoji: "🇳🇿" },
  // Group H
  { fifaCode: "ESP", name: "Spain", groupName: "H", flagEmoji: "🇪🇸" },
  { fifaCode: "CPV", name: "Cape Verde", groupName: "H", flagEmoji: "🇨🇻" },
  { fifaCode: "KSA", name: "Saudi Arabia", groupName: "H", flagEmoji: "🇸🇦" },
  { fifaCode: "URU", name: "Uruguay", groupName: "H", flagEmoji: "🇺🇾" },
  // Group I
  { fifaCode: "FRA", name: "France", groupName: "I", flagEmoji: "🇫🇷" },
  { fifaCode: "SEN", name: "Senegal", groupName: "I", flagEmoji: "🇸🇳" },
  { fifaCode: "IRQ", name: "Iraq", groupName: "I", flagEmoji: "🇮🇶" },
  { fifaCode: "NOR", name: "Norway", groupName: "I", flagEmoji: "🇳🇴" },
  // Group J
  { fifaCode: "ARG", name: "Argentina", groupName: "J", flagEmoji: "🇦🇷" },
  { fifaCode: "ALG", name: "Algeria", groupName: "J", flagEmoji: "🇩🇿" },
  { fifaCode: "AUT", name: "Austria", groupName: "J", flagEmoji: "🇦🇹" },
  { fifaCode: "JOR", name: "Jordan", groupName: "J", flagEmoji: "🇯🇴" },
  // Group K
  { fifaCode: "POR", name: "Portugal", groupName: "K", flagEmoji: "🇵🇹" },
  { fifaCode: "COD", name: "DR Congo", groupName: "K", flagEmoji: "🇨🇩" },
  { fifaCode: "UZB", name: "Uzbekistan", groupName: "K", flagEmoji: "🇺🇿" },
  { fifaCode: "COL", name: "Colombia", groupName: "K", flagEmoji: "🇨🇴" },
  // Group L
  { fifaCode: "ENG", name: "England", groupName: "L", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { fifaCode: "CRO", name: "Croatia", groupName: "L", flagEmoji: "🇭🇷" },
  { fifaCode: "GHA", name: "Ghana", groupName: "L", flagEmoji: "🇬🇭" },
  { fifaCode: "PAN", name: "Panama", groupName: "L", flagEmoji: "🇵🇦" },
];
