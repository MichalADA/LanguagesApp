export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string[];
  state: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  countrycode: "HR";
  lastcheckok: 1;
}

export type RadioFilter = "all" | "talk" | "music";
