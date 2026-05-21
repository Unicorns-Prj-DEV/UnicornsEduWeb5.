import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "./node_modules/typescript/lib/typescript.js";

function compileModule(relativePath, requireMap = {}) {
  const sourcePath = path.join(import.meta.dirname, relativePath);
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  const moduleShim = { exports };
  const localRequire = (id) => {
    if (id in requireMap) return requireMap[id];
    throw new Error(`Unexpected require: ${id}`);
  };
  new Function("exports", "module", "require", compiled)(
    exports,
    moduleShim,
    localRequire,
  );
  return moduleShim.exports;
}

const authDto = {
  Role: {
    admin: "admin",
    staff: "staff",
    student: "student",
    guest: "guest",
  },
};
const staffLessonWorkspace = compileModule("lib/staff-lesson-workspace.ts", {
  "@/dtos/Auth.dto": authDto,
});
const adminShellAccess = compileModule("lib/admin-shell-access.ts", {
  "@/dtos/Auth.dto": authDto,
});
const staffShellAccess = compileModule("lib/staff-shell-access.ts", {
  "@/dtos/Auth.dto": authDto,
  "@/lib/staff-lesson-workspace": staffLessonWorkspace,
});
const authRedirect = compileModule("lib/auth-redirect.ts", {
  "@/dtos/Auth.dto": authDto,
  "@/lib/admin-shell-access": adminShellAccess,
  "@/lib/staff-shell-access": staffShellAccess,
});

const completedStaffAccess = {
  staffProfileComplete: true,
  access: {
    admin: { canAccess: false, tier: null },
    staff: { canAccess: true, profileComplete: true },
    student: { canAccess: false },
  },
};

const incompleteStaffAccess = {
  staffProfileComplete: false,
  requiresStaffDataConsent: true,
  dataConsentAcceptedAt: null,
  dataConsentVersion: null,
  access: {
    admin: { canAccess: false, tier: null },
    staff: { canAccess: true, profileComplete: false },
    student: { canAccess: false },
  },
};

function userProfileRequiredHref(from) {
  return `/user-profile?profile_required=1&from=${encodeURIComponent(from)}`;
}

test("post-login redirect sends accountant to staff shell", () => {
  assert.equal(
    authRedirect.resolvePostLoginRedirect({
      id: "accountant-user",
      accountHandle: "accountant",
      roleType: "staff",
      requiresPasswordSetup: false,
      canAccessRestrictedRoutes: true,
      staffRoles: ["accountant"],
      hasStaffProfile: true,
      hasStudentProfile: false,
      ...completedStaffAccess,
    }),
    "/staff",
  );
});

test("post-login redirect sends incomplete staff profile to user profile", () => {
  assert.equal(
    authRedirect.resolvePostLoginRedirect({
      id: "staff-user",
      accountHandle: "staff-user",
      roleType: "staff",
      requiresPasswordSetup: false,
      canAccessRestrictedRoutes: true,
      requiresStaffDataConsent: true,
      staffRoles: ["teacher"],
      hasStaffProfile: true,
      hasStudentProfile: false,
      ...incompleteStaffAccess,
    }),
    userProfileRequiredHref("/staff"),
  );
});

test("non-admin staff roles are blocked from staff shell until profile and data consent are complete", () => {
  const roleRoutes = [
    ["teacher", "/staff/classes/class-1"],
    ["lesson_plan", "/staff/lesson-plans"],
    ["lesson_plan_head", "/staff/lesson-plans"],
    ["accountant", "/staff/accountant-detail"],
    ["communication", "/staff/communication-detail"],
    ["technical", "/staff/technical-detail"],
    ["customer_care", "/staff/customer-care-detail"],
    ["assistant", "/staff/users"],
  ];

  for (const [staffRole, pathname] of roleRoutes) {
    const session = {
      id: `${staffRole}-user`,
      accountHandle: staffRole,
      roleType: "staff",
      requiresPasswordSetup: false,
      canAccessRestrictedRoutes: true,
      staffRoles: [staffRole],
      hasStaffProfile: true,
      hasStudentProfile: false,
      effectiveRoleTypes: ["staff"],
      preferredRedirect: "/staff",
      ...incompleteStaffAccess,
    };

    assert.equal(
      staffShellAccess.resolveStaffShellRouteAccess(session, "/staff")
        .redirectHref,
      userProfileRequiredHref("/staff"),
      staffRole,
    );
    assert.equal(
      staffShellAccess.resolveStaffShellRouteAccess(session, pathname)
        .redirectHref,
      userProfileRequiredHref(pathname),
      staffRole,
    );
    assert.equal(
      authRedirect.resolvePostLoginRedirect(session),
      userProfileRequiredHref("/staff"),
      staffRole,
    );
  }
});

test("post-login redirect ignores admin next paths for non-admin staff", () => {
  assert.equal(
    authRedirect.resolvePostLoginRedirect(
      {
        id: "accountant-user",
        accountHandle: "accountant",
        roleType: "staff",
        requiresPasswordSetup: false,
        canAccessRestrictedRoutes: true,
        staffRoles: ["accountant"],
        hasStaffProfile: true,
        hasStudentProfile: false,
        ...completedStaffAccess,
      },
      "/admin/classes",
    ),
    "/staff",
  );
});

test("post-login redirect sends staff admin role to staff shell", () => {
  assert.equal(
    authRedirect.resolvePostLoginRedirect({
      id: "staff-admin-user",
      accountHandle: "staff-admin",
      roleType: "staff",
      requiresPasswordSetup: false,
      canAccessRestrictedRoutes: true,
      staffRoles: ["admin"],
      hasStaffProfile: true,
      hasStudentProfile: false,
      effectiveRoleTypes: ["staff", "admin"],
      access: { admin: { canAccess: true, tier: "full" } },
      preferredRedirect: "/admin/dashboard",
    }),
    "/staff",
  );
});

test("post-login redirect sends primary student to student shell", () => {
  assert.equal(
    authRedirect.resolvePostLoginRedirect({
      id: "student-staff-user",
      accountHandle: "student-staff",
      roleType: "student",
      requiresPasswordSetup: false,
      canAccessRestrictedRoutes: true,
      staffRoles: ["teacher"],
      hasStaffProfile: true,
      hasStudentProfile: true,
      effectiveRoleTypes: ["student", "staff"],
      preferredRedirect: "/staff",
    }),
    "/student",
  );
});

test("post-login redirect sends primary admin to admin shell", () => {
  const session = {
    id: "admin-user",
    accountHandle: "admin",
    roleType: "admin",
    requiresPasswordSetup: false,
    canAccessRestrictedRoutes: true,
    staffRoles: [],
    hasStaffProfile: false,
    hasStudentProfile: false,
  };

  assert.equal(
    authRedirect.resolvePostLoginRedirect(session),
    "/admin/dashboard",
  );
  assert.equal(
    authRedirect.resolvePostLoginRedirect(session, "/admin/users"),
    "/admin/users",
  );
});

test("post-login redirect lets primary admin keep staff workspace next path", () => {
  const session = {
    id: "admin-user",
    accountHandle: "admin",
    roleType: "admin",
    requiresPasswordSetup: false,
    canAccessRestrictedRoutes: true,
    staffRoles: [],
    hasStaffProfile: false,
    hasStudentProfile: false,
    effectiveRoleTypes: ["admin"],
    access: { admin: { canAccess: true, tier: "full" } },
  };

  assert.equal(
    authRedirect.resolvePostLoginRedirect(session, "/staff/classes"),
    "/staff/classes",
  );
});

test("linked staff roles unlock staff shell even when primary role is student", () => {
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(
      {
        id: "student-staff-user",
        accountHandle: "student-staff",
        roleType: "student",
        requiresPasswordSetup: false,
        canAccessRestrictedRoutes: true,
        staffRoles: ["technical"],
        hasStaffProfile: true,
        hasStudentProfile: true,
        staffProfileComplete: true,
        access: {
          admin: { canAccess: false, tier: null },
          staff: { canAccess: true, profileComplete: true },
          student: { canAccess: true },
        },
      },
      "/staff/technical-detail",
    ).isAllowed,
    true,
  );
});

test("staff data consent route is no longer a staff workspace route", () => {
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(
      {
        id: "staff-user",
        accountHandle: "staff-user",
        roleType: "staff",
        requiresPasswordSetup: false,
        canAccessRestrictedRoutes: true,
        requiresStaffDataConsent: true,
        staffRoles: ["teacher"],
        hasStaffProfile: true,
        hasStudentProfile: false,
        ...incompleteStaffAccess,
      },
      "/staff/data-consent",
    ).isAllowed,
    false,
  );
});

test("linked staff teacher unlocks class detail when primary role is student", () => {
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(
      {
        id: "student-teacher-user",
        accountHandle: "student-teacher",
        roleType: "student",
        requiresPasswordSetup: false,
        canAccessRestrictedRoutes: true,
        staffRoles: ["teacher"],
        hasStaffProfile: true,
        hasStudentProfile: true,
        staffProfileComplete: true,
        access: {
          admin: { canAccess: false, tier: null },
          staff: { canAccess: true, profileComplete: true },
          student: { canAccess: true },
        },
      },
      "/staff/classes/class-1",
    ).isAllowed,
    true,
  );
});

test("primary admin bypasses staff shell profile requirement", () => {
  const session = {
    id: "admin-user",
    accountHandle: "admin",
    roleType: "admin",
    requiresPasswordSetup: false,
    canAccessRestrictedRoutes: true,
    staffRoles: [],
    hasStaffProfile: false,
    hasStudentProfile: false,
    effectiveRoleTypes: ["admin"],
    access: { admin: { canAccess: true, tier: "full" } },
  };

  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(
      session,
      "/staff/classes/class-1",
    ).isAllowed,
    true,
  );
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(session, "/staff/users")
      .isAllowed,
    true,
  );
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(session, "/staff/profile")
      .redirectHref,
    null,
  );
});

test("linked staff admin gets full admin shell even when primary role is student", () => {
  const access = adminShellAccess.resolveAdminShellAccess({
    id: "student-staff-admin",
    accountHandle: "student-staff-admin",
    roleType: "student",
    requiresPasswordSetup: false,
    canAccessRestrictedRoutes: true,
    staffRoles: ["admin"],
    hasStaffProfile: true,
    hasStudentProfile: true,
  });

  assert.equal(access.isAdmin, true);
  assert.equal(
    adminShellAccess.canAccessAdminShellRoute(access, "/admin/users"),
    true,
  );
});

test("admin extra allowance management is open to admin, assistant, and accountant", () => {
  const fullAdmin = adminShellAccess.resolveAdminShellAccess({
    roleType: "admin",
  });
  const assistant = adminShellAccess.resolveAdminShellAccess({
    roleType: "staff",
    staffRoles: ["assistant"],
    hasStaffProfile: true,
  });
  const accountant = adminShellAccess.resolveAdminShellAccess({
    roleType: "staff",
    staffRoles: ["accountant"],
    hasStaffProfile: true,
  });

  assert.equal(
    adminShellAccess.canManageAdminExtraAllowance(fullAdmin),
    true,
  );
  assert.equal(
    adminShellAccess.canManageAdminExtraAllowance(assistant),
    true,
  );
  assert.equal(
    adminShellAccess.canManageAdminExtraAllowance(accountant),
    true,
  );
});

test("admin extra allowance management remains closed to unrelated staff roles", () => {
  const communication = adminShellAccess.resolveAdminShellAccess({
    roleType: "staff",
    staffRoles: ["communication"],
    hasStaffProfile: true,
  });

  assert.equal(
    adminShellAccess.canManageAdminExtraAllowance(communication),
    false,
  );
});

test("linked staff admin gets full staff shell routes even when primary role is student", () => {
  const session = {
    id: "student-staff-admin",
    accountHandle: "student-staff-admin",
    roleType: "student",
    requiresPasswordSetup: false,
    canAccessRestrictedRoutes: true,
    staffRoles: ["admin"],
    hasStaffProfile: true,
    hasStudentProfile: true,
    effectiveRoleTypes: ["student", "staff", "admin"],
    access: { admin: { canAccess: true, tier: "full" } },
  };

  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(session, "/staff/calendar")
      .isAllowed,
    true,
  );
  assert.equal(
    staffShellAccess.resolveStaffShellRouteAccess(
      session,
      "/staff/classes/class-1",
    ).isAllowed,
    true,
  );
});
