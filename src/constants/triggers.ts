export type TriggerKey =
  | "violence"
  | "sexual_violence"
  | "self_harm"
  | "suicide"
  | "substance_abuse"
  | "war"
  | "flashing_lights"
  | "animal_harm";

export const TRIGGERS: { key: TriggerKey; label: string }[] = [
  { key: "violence", label: "Violence" },
  { key: "sexual_violence", label: "Sexual violence" },
  { key: "self_harm", label: "Self-harm" },
  { key: "suicide", label: "Suicide" },
  { key: "substance_abuse", label: "Substance abuse" },
  { key: "war", label: "War / combat" },
  { key: "flashing_lights", label: "Flashing lights" },
  { key: "animal_harm", label: "Animal harm" },
];
