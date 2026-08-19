const userService = require("../services/user.service");
const {
  createUserSchema,
  updateUserSchema,
  updateOwnProfileSchema,
  listUsersQuerySchema,
} = require("../validation/user.validation");
const { ok } = require("../utils/apiResponse");

async function list(req, res, next) {
  try {
    const filters = listUsersQuerySchema.parse(req.query);
    const users = await userService.listUsers(req.user, filters);
    return ok(res, { users });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.createUser(req.user, input, req);
    return ok(res, { user }, "User created", 201);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    // req.targetUser was loaded + scope-checked by requireTargetUserInScope.
    return ok(res, { user: userService.sanitizeUser(req.targetUser) });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(req.user, req.targetUser, input, req);
    return ok(res, { user }, "User updated");
  } catch (err) {
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const user = await userService.setUserStatus(req.user, req.targetUser, "ACTIVE", req);
    return ok(res, { user }, "User activated");
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const user = await userService.setUserStatus(req.user, req.targetUser, "SUSPENDED", req);
    return ok(res, { user }, "User deactivated");
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const user = await userService.softDeleteUser(req.user, req.targetUser, req);
    return ok(res, { user }, "User deleted");
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    return ok(res, { user: req.user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const input = updateOwnProfileSchema.parse(req.body);
    const user = await userService.updateOwnProfile(req.user, input);
    return ok(res, { user }, "Profile updated");
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await userService.resetPassword(req.user, req.targetUser, req);
    return ok(
      res,
      result,
      "Password reset. Share this temporary password with the student securely — it will not be shown again."
    );
  } catch (err) {
    next(err);
  }
}

async function getAccess(req, res, next) {
  try {
    const access = await userService.getUserProductAccessList(req.targetUser);
    return ok(res, { access });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  getOne,
  update,
  activate,
  deactivate,
  remove,
  me,
  updateMe,
  resetPassword,
  getAccess,
};