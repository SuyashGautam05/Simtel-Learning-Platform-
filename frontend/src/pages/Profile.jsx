import { useState } from "react";
import { User, Mail, Building2, Shield, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { updateMyProfile } from "../api/users.js";

const roleLabel = { SUPER_ADMIN: "Super Admin", ADMIN: "College Admin", USER: "Student" };

export default function Profile() {
  const { user, refetch, changePassword } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    setNameSaved(false);
    try {
      await updateMyProfile({ name });
      await refetch();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    setPwSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err.response?.data?.message || "Couldn't change your password. Please try again.");
    } finally {
      setPwSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Profile</h1>
        <p className="mt-1 text-sm text-navy-400">Manage your account details.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-gold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-navy-900">{user?.name}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-500">
              <Shield size={11} /> {roleLabel[user?.role]}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-navy-50 pt-6 text-sm">
          <div className="flex items-center gap-2 text-navy-500">
            <Mail size={14} className="text-navy-300" />
            {user?.email}
          </div>
          {user?.collegeId && (
            <div className="flex items-center gap-2 text-navy-500">
              <Building2 size={14} className="text-navy-300" />
              College-affiliated account
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveName} className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-navy-900">
          <User size={16} /> Display name
        </h2>
        <div className="mt-4 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            className="input-field flex-1"
          />
          <button type="submit" disabled={savingName} className="btn-primary shrink-0">
            {savingName ? "Saving..." : "Save"}
          </button>
        </div>
        {nameSaved && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-gold-700 animate-fade-in">
            <CheckCircle2 size={13} /> Updated
          </p>
        )}
      </form>

      <form onSubmit={handleChangePassword} className="card p-6">
        <h2 className="flex items-center gap-2 font-semibold text-navy-900">
          <Lock size={16} /> Change password
        </h2>
        <div className="mt-4 space-y-3">
          <input
            type="password"
            required
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field"
          />
          {pwError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-1 rounded-lg border border-gold-100 bg-gold-50 px-3 py-2 text-xs font-medium text-gold-700">
              <CheckCircle2 size={13} /> Password changed. Other sessions have been signed out.
            </div>
          )}
          <button type="submit" disabled={pwSubmitting} className="btn-primary w-full">
            {pwSubmitting ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}