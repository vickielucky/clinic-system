
"use client";

import { useState, useEffect } from "react";
import {
  User, Building2, Lock, Bell, CheckCircle2, Camera, Mail,
  Phone, MapPin, Shield, Clock, UserPlus, Trash2, ToggleLeft, ToggleRight, X,
} from "lucide-react";

// Staff type
type StaffUser = { id: number; username: string; fullName: string; role: string; email?: string; phone?: string; licenseNo?: string; isActive: boolean; createdAt: string; };
type CurrentUser = { id: number; username: string; fullName: string; role: string; email?: string };

const tabs = ["Profile", "Pharmacy", "Security", "Preferences", "Staff"] as const;
type Tab = typeof tabs[number];

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
const lbl = "text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block";

const PREFS_KEY = "clinic_prefs";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [saved,     setSaved]     = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "Pharmacist", licenseNo: "", bio: "" });
  const [pharmacy, setPharmacy] = useState({ name: "Krrish P~Kay Pharmacy", address: "Nairobi, Kenya", phone: "+254 700 000 001", email: "info@krrishpkay.com", licenseNo: "PPB/PH/2024/456", openTime: "08:00", closeTime: "20:00" });
  const [security, setSecurity] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [secError,  setSecError]  = useState("");
  const [secLoading, setSecLoading] = useState(false);
  const [prefs, setPrefs] = useState({ expiryAlertDays: "30", lowStockDefault: "50", currency: "KES", dateFormat: "DD/MM/YYYY", emailAlerts: true, browserAlerts: true });

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((u) => {
      if (u) {
        setCurrentUser(u);
        setProfile((p) => ({ ...p, firstName: u.fullName.split(" ")[0] || "", lastName: u.fullName.split(" ").slice(1).join(" ") || "", email: u.email || "", role: u.role || "Pharmacist" }));
      }
    });
    const saved = loadPrefs();
    if (Object.keys(saved).length > 0) setPrefs((p) => ({ ...p, ...saved }));
  }, []);

  const showSaved = (msg = "Changes saved successfully") => {
    setSaved(msg); setTimeout(() => setSaved(""), 3000);
  };

  const handleProfileSave = async () => {
    await fetch("/api/staff", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentUser?.id, fullName: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email, phone: profile.phone, licenseNo: profile.licenseNo }),
    });
    showSaved("Profile updated");
  };

  const handlePharmacySave = () => showSaved("Pharmacy info updated");

  const handlePasswordSave = async () => {
    setSecError("");
    if (!security.currentPassword) { setSecError("Enter your current password."); return; }
    if (security.newPassword.length < 8) { setSecError("New password must be at least 8 characters."); return; }
    if (security.newPassword !== security.confirmPassword) { setSecError("Passwords do not match."); return; }
    setSecLoading(true);
    const res  = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: security.currentPassword, newPassword: security.newPassword }) });
    const data = await res.json();
    if (!res.ok) { setSecError(data.error || "Failed to change-password."); }
    else { setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" }); showSaved("Password changed successfully"); }
    setSecLoading(false);
  };

  const handlePrefsSave = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    showSaved("Preferences saved");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile, pharmacy info and preferences</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} /> {saved}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === t ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {activeTab === "Profile" && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl font-bold">
                {profile.firstName[0]}{profile.lastName[0] || ""}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shadow hover:bg-green-700 transition">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">{profile.firstName} {profile.lastName}</p>
              <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">{profile.role}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="First name" icon={<User size={14}/>}><input value={profile.firstName} onChange={(e)=>setProfile({...profile,firstName:e.target.value})} className={inp}/></F>
            <F label="Last name"  icon={<User size={14}/>}><input value={profile.lastName}  onChange={(e)=>setProfile({...profile,lastName:e.target.value})}  placeholder="Optional" className={inp}/></F>
            <F label="Email"      icon={<Mail size={14}/>}><input type="email" value={profile.email} onChange={(e)=>setProfile({...profile,email:e.target.value})} className={inp}/></F>
            <F label="Phone"      icon={<Phone size={14}/>}><input value={profile.phone} onChange={(e)=>setProfile({...profile,phone:e.target.value})} className={inp}/></F>
            <F label="Role"       icon={<Shield size={14}/>}>
              <select value={profile.role} onChange={(e)=>setProfile({...profile,role:e.target.value})} className={inp}>
                {["Pharmacist","Pharmacy Technician","Pharmacy Assistant","Manager","Admin"].map((r)=><option key={r}>{r}</option>)}
              </select>
            </F>
            <F label="License no." icon={<Shield size={14}/>}><input value={profile.licenseNo} onChange={(e)=>setProfile({...profile,licenseNo:e.target.value})} placeholder="PPB/2024/00123" className={inp}/></F>
            <div className="sm:col-span-2">
              <F label="Bio" icon={<User size={14}/>}><textarea value={profile.bio} onChange={(e)=>setProfile({...profile,bio:e.target.value})} rows={3} className={inp+" resize-none"} placeholder="Short description (optional)"/></F>
            </div>
          </div>
          <div className="flex justify-end"><Btn onClick={handleProfileSave}>Save changes</Btn></div>
        </div>
      )}

      {/* PHARMACY */}
      {activeTab === "Pharmacy" && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Building2 size={18} className="text-green-700"/></div>
            <div><p className="font-semibold text-gray-800">{pharmacy.name}</p><p className="text-xs text-gray-400">Pharmacy details</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><F label="Pharmacy name" icon={<Building2 size={14}/>}><input value={pharmacy.name} onChange={(e)=>setPharmacy({...pharmacy,name:e.target.value})} className={inp}/></F></div>
            <div className="sm:col-span-2"><F label="Address" icon={<MapPin size={14}/>}><input value={pharmacy.address} onChange={(e)=>setPharmacy({...pharmacy,address:e.target.value})} className={inp}/></F></div>
            <F label="Phone" icon={<Phone size={14}/>}><input value={pharmacy.phone} onChange={(e)=>setPharmacy({...pharmacy,phone:e.target.value})} className={inp}/></F>
            <F label="Email" icon={<Mail size={14}/>}><input value={pharmacy.email} onChange={(e)=>setPharmacy({...pharmacy,email:e.target.value})} className={inp}/></F>
            <F label="PPB License" icon={<Shield size={14}/>}><input value={pharmacy.licenseNo} onChange={(e)=>setPharmacy({...pharmacy,licenseNo:e.target.value})} className={inp}/></F>
            <div/>
            <F label="Opening time" icon={<Clock size={14}/>}><input type="time" value={pharmacy.openTime} onChange={(e)=>setPharmacy({...pharmacy,openTime:e.target.value})} className={inp}/></F>
            <F label="Closing time" icon={<Clock size={14}/>}><input type="time" value={pharmacy.closeTime} onChange={(e)=>setPharmacy({...pharmacy,closeTime:e.target.value})} className={inp}/></F>
          </div>
          <div className="flex justify-end"><Btn onClick={handlePharmacySave}>Save changes</Btn></div>
        </div>
      )}

      {/* SECURITY */}
      {activeTab === "Security" && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Lock size={18} className="text-green-700"/></div>
            <div><p className="font-semibold text-gray-800">Change password</p><p className="text-xs text-gray-400">Use at least 8 characters</p></div>
          </div>
          <div className="space-y-4 max-w-md">
            <F label="Current password" icon={<Lock size={14}/>}><input type="password" value={security.currentPassword} onChange={(e)=>setSecurity({...security,currentPassword:e.target.value})} placeholder="••••••••" className={inp}/></F>
            <F label="New password"     icon={<Lock size={14}/>}><input type="password" value={security.newPassword}     onChange={(e)=>setSecurity({...security,newPassword:e.target.value})}     placeholder="••••••••" className={inp}/></F>
            <F label="Confirm password" icon={<Lock size={14}/>}><input type="password" value={security.confirmPassword} onChange={(e)=>setSecurity({...security,confirmPassword:e.target.value})} placeholder="••••••••" className={inp}/></F>
            {secError && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{secError}</p>}
          </div>
          <div className="flex justify-end">
            <Btn onClick={handlePasswordSave} disabled={secLoading}>{secLoading ? "Updating..." : "Update password"}</Btn>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-medium text-gray-700 mb-3">Active session</p>
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Current device</p>
                <p className="text-xs text-gray-400 mt-0.5">Nairobi, Kenya · {new Date().toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"})}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* PREFERENCES */}
      {activeTab === "Preferences" && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Bell size={15} className="text-green-600"/>Alert thresholds</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Expiry alert (days before)"><input type="number" value={prefs.expiryAlertDays} onChange={(e)=>setPrefs({...prefs,expiryAlertDays:e.target.value})} className={inp}/></F>
              <F label="Default reorder level (units)"><input type="number" value={prefs.lowStockDefault} onChange={(e)=>setPrefs({...prefs,lowStockDefault:e.target.value})} className={inp}/></F>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Display</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Currency">
                <select value={prefs.currency} onChange={(e)=>setPrefs({...prefs,currency:e.target.value})} className={inp}>
                  {["KES","USD","EUR","GBP","UGX","TZS"].map((c)=><option key={c}>{c}</option>)}
                </select>
              </F>
              <F label="Date format">
                <select value={prefs.dateFormat} onChange={(e)=>setPrefs({...prefs,dateFormat:e.target.value})} className={inp}>
                  {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map((f)=><option key={f}>{f}</option>)}
                </select>
              </F>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Notifications</p>
            <div className="space-y-3">
              <Toggle label="Browser notifications" description="Show alerts in the notification bell" checked={prefs.browserAlerts} onChange={(v)=>setPrefs({...prefs,browserAlerts:v})}/>
              <Toggle label="Email notifications"   description="Send alerts to your email address"   checked={prefs.emailAlerts}   onChange={(v)=>setPrefs({...prefs,emailAlerts:v})}/>
            </div>
          </div>
          <div className="flex justify-end"><Btn onClick={handlePrefsSave}>Save preferences</Btn></div>
        </div>
      )}

      {/* STAFF */}
      {activeTab === "Staff" && <StaffTab showSaved={showSaved} />}
    </div>
  );
}

/* ── Staff Tab ── */
function StaffTab({ showSaved }: { showSaved: (msg?: string) => void }) {
  const [staff,        setStaff]        = useState<StaffUser[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const emptyForm = { username: "", password: "", fullName: "", role: "Pharmacist", email: "", phone: "", licenseNo: "" };
  const [form, setForm] = useState(emptyForm);
  const ROLES = ["Admin","Pharmacist","Pharmacy Technician","Pharmacy Assistant","Manager"];

  const fetchStaff = async () => {
    const res = await fetch("/api/staff"); const data = await res.json();
    setStaff(Array.isArray(data) ? data : []); setLoading(false);
  };
  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async () => {
    setError("");
    if (!form.username || !form.password || !form.fullName) { setError("Username, password and full name are required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create staff."); }
    else { setShowModal(false); setForm(emptyForm); fetchStaff(); showSaved(`${form.fullName} added successfully`); }
    setSaving(false);
  };

  const toggleActive = async (u: StaffUser) => {
    await fetch("/api/staff", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, isActive: !u.isActive }) });
    fetchStaff();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch("/api/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
    setDeleteTarget(null); fetchStaff(); showSaved("Staff member removed");
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="font-semibold text-gray-800">Staff accounts</p><p className="text-xs text-gray-400 mt-0.5">Only active accounts can log in</p></div>
        <button onClick={()=>{setShowModal(true);setError("");setForm(emptyForm);}} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <UserPlus size={15}/> Add staff
        </button>
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div>
      : staff.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">No staff accounts yet</p>
      : (
        <div className="space-y-2">
          {staff.map((u) => (
            <div key={u.id} className={`flex items-center justify-between p-4 rounded-xl border ${u.isActive?"bg-gray-50 border-gray-100":"bg-red-50 border-red-100 opacity-70"}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                  {u.fullName.split(" ").map((n)=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.fullName}</p>
                  <p className="text-xs text-gray-400">@{u.username} · {u.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>
                  {u.isActive?"Active":"Inactive"}
                </span>
                <button onClick={()=>toggleActive(u)} className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-500">
                  {u.isActive?<ToggleRight size={16} className="text-green-600"/>:<ToggleLeft size={16}/>}
                </button>
                <button onClick={()=>setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Add new staff" onClose={()=>setShowModal(false)}>
          <div className="space-y-3">
            <F label="Full name *"><input value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})} placeholder="e.g. Jane Wanjiku" className={inp}/></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Username *"><input value={form.username} onChange={(e)=>setForm({...form,username:e.target.value})} placeholder="e.g. jane" className={inp}/></F>
              <F label="Password *"><input type="password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} placeholder="Min 8 chars" className={inp}/></F>
            </div>
            <F label="Role"><select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} className={inp}>{ROLES.map((r)=><option key={r}>{r}</option>)}</select></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Email"><input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="optional" className={inp}/></F>
              <F label="Phone"><input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="optional" className={inp}/></F>
            </div>
            <F label="License no."><input value={form.licenseNo} onChange={(e)=>setForm({...form,licenseNo:e.target.value})} placeholder="PPB/2024/..." className={inp}/></F>
            {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60">
                {saving?"Adding...":"Add staff"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Remove staff member" onClose={()=>setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-5">Remove <strong>{deleteTarget.fullName}</strong>? They will no longer be able to log in.</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteTarget(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Tiny helpers ── */
function F({ label: l, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div><label className={lbl}><span className="flex items-center gap-1">{icon}{l}</span></label>{children}</div>;
}
function Btn({ onClick, children, disabled }: { onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60">{children}</button>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toggle({ label: l, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div><p className="text-sm font-medium text-gray-700">{l}</p><p className="text-xs text-gray-400 mt-0.5">{description}</p></div>
      <button onClick={()=>onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors ${checked?"bg-green-500":"bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked?"translate-x-5":"translate-x-0.5"}`}/>
      </button>
    </div>
  );
}
