export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "v0.0.3",
    date: "2026-05-28 08:39 UTC",
    changes: [
      "Added OpenWeather Risk Agent",
      "Added weather-aware risk scoring",
      "Added historical lane intelligence",
      "Added detention, toll, and waiting cost estimates",
      "Added true net profit and true margin calculations",
      "Added why-ranked explanations",
      "Added Stage 1 progress block",
      "Updated README and environment example",
    ],
  },
  {
    version: "v0.0.2",
    date: "2026-05-26 06:41 UTC",
    changes: [
      "Migrated demo to US trucking lanes",
      "Added 10 preset dry van loads",
      "Added 3 demo trucks",
      "Switched economics from kilometers to miles",
      "Added state-based fuel cost",
      "Added driver cost per mile",
      "Added ranked multi-load comparison",
      "Added v0.0.2 timestamp to the live demo",
    ],
  },
];

export const latestChangelogEntry = changelogEntries[0];
