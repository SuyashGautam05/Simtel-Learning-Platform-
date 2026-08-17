const collegeService = require("../services/college.service");
const { createCollegeSchema, updateCollegeSchema } = require("../validation/college.validation");
const { ok } = require("../utils/apiResponse");

async function list(req, res, next) {
  try {
    const colleges = await collegeService.listColleges();
    return ok(res, { colleges });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const college = await collegeService.getCollege(req.params.id);
    return ok(res, { college });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const input = createCollegeSchema.parse(req.body);
    const college = await collegeService.createCollege(input, req.user);
    return ok(res, { college }, "College created", 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const input = updateCollegeSchema.parse(req.body);
    const college = await collegeService.updateCollege(req.params.id, input, req.user);
    return ok(res, { college }, "College updated");
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const college = await collegeService.deleteCollege(req.params.id, req.user);
    return ok(res, { college }, "College deactivated");
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const data = await collegeService.getCollegeStats(req.params.id);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function recentActivity(req, res, next) {
  try {
    const activity = await collegeService.getCollegeRecentActivity(req.params.id);
    return ok(res, { activity });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove, stats, recentActivity };