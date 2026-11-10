// Retired identities remain accepted for older exports and exact backup recovery.
export const LEGACY_COURSE_ID='bayfront-long-1';
export const RETIRED_COURSE_IDS=Object.freeze([LEGACY_COURSE_ID,'beginner-speed-1','beginner-rhythm-1','beginner-braking-1']);
export const ACTIVE_COURSE_IDS=Object.freeze(['city-geometry-1','geometry-speed-1','geometry-rhythm-1','geometry-braking-1','speed-ring-circuit-1','marina-city-1']);
export const COURSE_IDS=Object.freeze([...RETIRED_COURSE_IDS,...ACTIVE_COURSE_IDS]);
// The user authorized resetting old lap times, while retaining economy/settings.
export function resetRetiredRecords(save){save.best={};for(const id of RETIRED_COURSE_IDS)delete save.courseBest?.[id];return save;}
