import { afterEach, describe, expect, it, vi } from "vitest";
import {
  actionsFor, averageConsultMinutes, compareQueue, countAhead, estimateWaitMinutes, formatWait,
  nextStatus, phaseFor, summarizeDay, timestampChanges, type QueueEntry, type Status,
} from "./queue";
import { currentTime, nowInClinicTz } from "./time";

const entry = (id: string, slotTime: string, tokenNumber: number, status: Status = "BOOKED"): QueueEntry => ({ id, slotTime, tokenNumber, status });

describe("status changes", () => {
  it("follows the normal path", () => {
    expect(nextStatus("BOOKED", "check_in")).toBe("CHECKED_IN");
    expect(nextStatus("CHECKED_IN", "start")).toBe("IN_PROGRESS");
    expect(nextStatus("IN_PROGRESS", "complete")).toBe("COMPLETED");
  });

  it("allows no-show before the visit starts", () => {
    expect(nextStatus("BOOKED", "no_show")).toBe("NO_SHOW");
    expect(nextStatus("CHECKED_IN", "no_show")).toBe("NO_SHOW");
    expect(nextStatus("IN_PROGRESS", "no_show")).toBeNull();
  });

  it("does not allow skipping steps", () => {
    expect(nextStatus("BOOKED", "start")).toBeNull();
    expect(nextStatus("BOOKED", "complete")).toBeNull();
    expect(nextStatus("CHECKED_IN", "complete")).toBeNull();
    expect(nextStatus("COMPLETED", "undo")).toBeNull();
    expect(nextStatus("CANCELLED", "check_in")).toBeNull();
  });

  it("undo steps back one level", () => {
    expect(nextStatus("CHECKED_IN", "undo")).toBe("BOOKED");
    expect(nextStatus("IN_PROGRESS", "undo")).toBe("CHECKED_IN");
    expect(nextStatus("NO_SHOW", "undo")).toBe("BOOKED");
  });

  it("shows the right buttons for each status", () => {
    expect(actionsFor("BOOKED")).toEqual(["check_in", "no_show"]);
    expect(actionsFor("CHECKED_IN")).toEqual(["start", "no_show", "undo"]);
    expect(actionsFor("IN_PROGRESS")).toEqual(["complete", "undo"]);
    expect(actionsFor("NO_SHOW")).toEqual(["undo"]);
    expect(actionsFor("COMPLETED")).toEqual([]);
    expect(actionsFor("CANCELLED")).toEqual([]);
  });

  it("records and clears the right time stamps", () => {
    const now = new Date("2026-11-22T11:00:00Z");
    expect(timestampChanges("check_in", "BOOKED", now)).toEqual({ checkedInAt: now });
    expect(timestampChanges("start", "CHECKED_IN", now)).toEqual({ startedAt: now });
    expect(timestampChanges("complete", "IN_PROGRESS", now)).toEqual({ completedAt: now });
    expect(timestampChanges("undo", "CHECKED_IN", now)).toEqual({ checkedInAt: null });
    expect(timestampChanges("undo", "IN_PROGRESS", now)).toEqual({ startedAt: null });
    expect(timestampChanges("undo", "NO_SHOW", now)).toEqual({});
    expect(timestampChanges("no_show", "BOOKED", now)).toEqual({});
  });
});

describe("position in the line", () => {
  it("orders by slot time, then token", () => {
    expect(compareQueue(entry("a", "17:00", 9), entry("b", "17:10", 1))).toBeLessThan(0);
    expect(compareQueue(entry("a", "17:00", 2), entry("b", "17:00", 1))).toBeGreaterThan(0);
  });

  it("counts earlier unfinished patients, whether or not they have arrived", () => {
    const all = [entry("p1", "17:00", 1), entry("p2", "17:10", 2, "CHECKED_IN"), entry("p3", "17:20", 3), entry("p4", "17:30", 4)];
    expect(countAhead(all[0], all)).toBe(0);
    expect(countAhead(all[1], all)).toBe(1);
    expect(countAhead(all[3], all)).toBe(3);
  });

  it("ignores finished, cancelled and no-show patients", () => {
    const all = [entry("p1", "17:00", 1, "COMPLETED"), entry("p2", "17:10", 2, "NO_SHOW"), entry("p3", "17:20", 3, "CANCELLED"), entry("p4", "17:30", 4)];
    expect(countAhead(all[3], all)).toBe(0);
  });

  it("books made in a different order do not change the order of the line", () => {
    // token 1 booked first, but for the LATEST slot
    const all = [entry("late", "20:00", 1), entry("early", "17:00", 2)];
    expect(countAhead(all[0], all)).toBe(1);
    expect(countAhead(all[1], all)).toBe(0);
  });

  it("always counts the patient who is with the doctor, even with a later slot", () => {
    const all = [entry("me", "17:00", 1), entry("seen", "17:10", 2, "IN_PROGRESS")];
    expect(countAhead(all[0], all)).toBe(1);
  });

  it("does not count yourself", () => {
    const me = entry("me", "17:00", 1, "IN_PROGRESS");
    expect(countAhead(me, [me])).toBe(0);
  });
});

describe("wait time", () => {
  it("uses the default until there are 3 usable samples", () => {
    expect(averageConsultMinutes([], 10)).toBe(10);
    expect(averageConsultMinutes([20, 22], 10)).toBe(10);
  });

  it("averages recent consultations", () => {
    expect(averageConsultMinutes([8, 12, 10], 15)).toBe(10);
    expect(averageConsultMinutes([7, 8, 9, 10], 15)).toBe(8.5);
  });

  it("ignores odd values and keeps at most 10 samples", () => {
    expect(averageConsultMinutes([0.2, 500, 10, 10, 10], 99)).toBe(10);
    expect(averageConsultMinutes([0.2, 500, 10, 10], 99)).toBe(99); // only 2 usable
    const twelve = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 100, 100];
    expect(averageConsultMinutes(twelve, 5)).toBe(10); // the extra two are not used
  });

  it("estimates wait as people ahead times average", () => {
    expect(estimateWaitMinutes(0, 10)).toBe(0);
    expect(estimateWaitMinutes(3, 10)).toBe(30);
    expect(estimateWaitMinutes(3, 8.5)).toBe(26);
  });

  it("writes waits in words", () => {
    expect(formatWait(0)).toBe("No wait");
    expect(formatWait(3)).toBe("Less than 5 minutes");
    expect(formatWait(23)).toBe("About 25 minutes");
    expect(formatWait(58)).toBe("About 1 hr");
    expect(formatWait(80)).toBe("About 1 hr 20 min");
    expect(formatWait(120)).toBe("About 2 hr");
  });
});

describe("what the patient sees", () => {
  const today = "2026-11-22";
  it("picks the right phase", () => {
    expect(phaseFor({ status: "COMPLETED", date: today, today, ahead: 0 })).toBe("closed");
    expect(phaseFor({ status: "CANCELLED", date: today, today, ahead: 0 })).toBe("closed");
    expect(phaseFor({ status: "BOOKED", date: "2026-11-23", today, ahead: 4 })).toBe("later");
    expect(phaseFor({ status: "BOOKED", date: "2026-11-21", today, ahead: 0 })).toBe("expired");
    expect(phaseFor({ status: "BOOKED", date: today, today, ahead: 3 })).toBe("not_arrived");
    expect(phaseFor({ status: "CHECKED_IN", date: today, today, ahead: 2 })).toBe("waiting");
    expect(phaseFor({ status: "CHECKED_IN", date: today, today, ahead: 0 })).toBe("next");
    expect(phaseFor({ status: "IN_PROGRESS", date: today, today, ahead: 0 })).toBe("with_doctor");
  });
});

describe("dashboard totals", () => {
  it("counts each status; expected excludes cancelled", () => {
    const totals = summarizeDay(["BOOKED", "BOOKED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"]);
    expect(totals).toEqual({ expected: 6, notArrived: 2, waiting: 1, withDoctor: 1, completed: 1, noShow: 1, cancelled: 1 });
  });
});

describe("demo clock", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("freezes time at DEMO_NOW", () => {
    vi.stubEnv("DEMO_NOW", "2026-11-22T17:30:00+06:00");
    expect(currentTime().toISOString()).toBe("2026-11-22T11:30:00.000Z");
    expect(nowInClinicTz()).toEqual({ date: "2026-11-22", minutes: 17 * 60 + 30 });
  });

  it("ignores a broken DEMO_NOW and uses the real time", () => {
    vi.stubEnv("DEMO_NOW", "not a date");
    expect(Math.abs(currentTime().getTime() - Date.now())).toBeLessThan(5000);
  });
});
