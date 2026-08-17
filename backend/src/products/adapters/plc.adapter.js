/**
 * Example adapter for the PLC module.
 * -----------------------------------------------------------------------
 * This is a stub — it returns static placeholder data. When the real PLC
 * simulation app is ready to plug in, this file is where that happens:
 * replace the bodies below with calls into that app (a DB query, an HTTP
 * call to a separate simulation service, reading from a CMS, whatever
 * fits), while keeping the same function signatures. Nothing outside this
 * file needs to change.
 *
 * Every handler receives { productCode, user } — `user` is the
 * authenticated requester (already confirmed to hold access by
 * requireModuleAccess before this ever runs), useful for personalizing
 * progress, saved state, etc. once that's wired up.
 * -----------------------------------------------------------------------
 */

async function theory({ productCode }) {
  return {
    available: true,
    section: "theory",
    productCode,
    items: [
      { id: "plc-intro", title: "Introduction to PLCs", durationMinutes: 15 },
      { id: "plc-ladder-logic", title: "Ladder Logic Fundamentals", durationMinutes: 25 },
    ],
  };
}

async function topics({ productCode }) {
  return {
    available: true,
    section: "topics",
    productCode,
    items: [
      { id: "topic-io", title: "Digital I/O" },
      { id: "topic-timers", title: "Timers & Counters" },
    ],
  };
}

async function simulations({ productCode }) {
  return {
    available: true,
    section: "simulations",
    productCode,
    items: [{ id: "sim-conveyor", title: "Conveyor Belt Control Simulation" }],
  };
}

async function experiments({ productCode }) {
  return {
    available: true,
    section: "experiments",
    productCode,
    items: [{ id: "exp-traffic-light", title: "Traffic Light Sequencing" }],
  };
}

async function quizzes({ productCode }) {
  return {
    available: true,
    section: "quizzes",
    productCode,
    items: [{ id: "quiz-ladder-basics", title: "Ladder Logic Basics Quiz", questionCount: 10 }],
  };
}

async function projects({ productCode }) {
  return {
    available: true,
    section: "projects",
    productCode,
    items: [{ id: "project-bottling-line", title: "Automated Bottling Line" }],
  };
}

module.exports = { theory, topics, simulations, experiments, quizzes, projects };