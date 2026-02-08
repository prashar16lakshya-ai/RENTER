import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { jsPDF } from "jspdf";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyTenant = {
  name: "",
  phone: "",
  roomNumber: "",
  rentAmount: "",
  electricityRate: ""
};

const emptyRecord = {
  previousReading: "",
  currentReading: "",
  rentAmount: "",
  electricityRate: "",
  date: "",
  paid: false,
  signatureDataUrl: ""
};

function AuthCard({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuth();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>{isRegister ? "Create account" : "Sign in"}</h2>
      <form onSubmit={handleSubmit} className="stack">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit">
          {isRegister ? "Register" : "Login"}
        </button>
      </form>
      <button className="link" type="button" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Already have an account? Sign in" : "New here? Create account"}
      </button>
    </div>
  );
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const startDrawing = (event) => {
    isDrawing.current = true;
    draw(event);
  };

  const endDrawing = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const draw = (event) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches?.[0]?.clientX) - rect.left;
    const y = (event.clientY || event.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2937";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="signature">
      <canvas
        ref={canvasRef}
        width="280"
        height="120"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      <button type="button" className="link" onClick={clearPad}>
        Clear signature
      </button>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [records, setRecords] = useState({});
  const [activeTenant, setActiveTenant] = useState(null);
  const [tenantForm, setTenantForm] = useState(emptyTenant);
  const [recordForm, setRecordForm] = useState(emptyRecord);
  const [meterPhoto, setMeterPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTenants();
  }, [user]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tenants`);
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (tenantId) => {
    try {
      const response = await fetch(`${API_URL}/api/tenants/${tenantId}/records`);
      const data = await response.json();
      setRecords((prev) => ({ ...prev, [tenantId]: data }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleTenantSubmit = async (event) => {
    event.preventDefault();
    const method = activeTenant ? "PUT" : "POST";
    const url = activeTenant
      ? `${API_URL}/api/tenants/${activeTenant.id}`
      : `${API_URL}/api/tenants`;
    const payload = {
      ...tenantForm,
      rentAmount: Number(tenantForm.rentAmount),
      electricityRate: Number(tenantForm.electricityRate)
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      await fetchTenants();
      setActiveTenant(null);
      setTenantForm(emptyTenant);
    }
  };

  const handleTenantDelete = async (tenantId) => {
    if (!confirm("Delete this tenant?")) return;
    await fetch(`${API_URL}/api/tenants/${tenantId}`, { method: "DELETE" });
    fetchTenants();
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    if (!activeTenant) return;

    const unitsUsed = Number(recordForm.currentReading) - Number(recordForm.previousReading);
    const electricityBill = unitsUsed * Number(recordForm.electricityRate);
    const total = electricityBill + Number(recordForm.rentAmount);

    const payload = {
      ...recordForm,
      unitsUsed,
      electricityBill,
      total,
      rentAmount: Number(recordForm.rentAmount),
      electricityRate: Number(recordForm.electricityRate)
    };

    const formData = new FormData();
    formData.append("tenantId", activeTenant.id);
    formData.append("record", JSON.stringify(payload));
    if (meterPhoto) {
      formData.append("meterPhoto", meterPhoto);
    }

    const response = await fetch(`${API_URL}/api/records`, {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      fetchRecords(activeTenant.id);
      setRecordForm((prev) => ({ ...prev, previousReading: "", currentReading: "" }));
      setMeterPhoto(null);
    }
  };

  const handlePaidToggle = async (record) => {
    const response = await fetch(`${API_URL}/api/records/${record.id}/pay`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !record.paid })
    });

    if (response.ok) {
      fetchRecords(record.tenantId);
    }
  };

  const handleReceipt = (record, tenant) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rent Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Tenant: ${tenant.name}`, 20, 35);
    doc.text(`Room: ${tenant.roomNumber}`, 20, 42);
    doc.text(`Date: ${record.date}`, 20, 49);
    doc.text(`Rent: ${record.rentAmount}`, 20, 60);
    doc.text(`Units: ${record.unitsUsed}`, 20, 67);
    doc.text(`Electricity: ${record.electricityBill}`, 20, 74);
    doc.text(`Total: ${record.total}`, 20, 81);

    if (record.signatureDataUrl) {
      doc.text("Signature:", 20, 98);
      doc.addImage(record.signatureDataUrl, "PNG", 20, 105, 60, 24);
    }

    doc.save(`receipt-${tenant.name}-${record.date}.pdf`);
  };

  const dashboard = useMemo(() => {
    const allRecords = Object.values(records).flat();
    const pending = allRecords.filter((record) => !record.paid);
    const total = allRecords.reduce((sum, record) => sum + Number(record.total || 0), 0);
    return { pending: pending.length, total };
  }, [records]);

  if (!user) {
    return (
      <div className="page">
        <header className="header">
          <h1>Rent Management</h1>
          <p>Track rent and electricity bills from one place.</p>
        </header>
        <AuthCard onAuth={fetchTenants} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Rent Management Dashboard</h1>
          <p>Welcome back! Manage tenants and monthly entries.</p>
        </div>
        <button className="link" type="button" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Overview</h2>
          <p>Tenants: {tenants.length}</p>
          <p>Pending payments: {dashboard.pending}</p>
          <p>Monthly total: ₹{dashboard.total.toFixed(2)}</p>
        </div>
        <div className="card">
          <h2>{activeTenant ? "Edit tenant" : "Add tenant"}</h2>
          <form onSubmit={handleTenantSubmit} className="stack">
            <input
              placeholder="Full name"
              value={tenantForm.name}
              onChange={(event) => setTenantForm({ ...tenantForm, name: event.target.value })}
              required
            />
            <input
              placeholder="Phone"
              value={tenantForm.phone}
              onChange={(event) => setTenantForm({ ...tenantForm, phone: event.target.value })}
              required
            />
            <input
              placeholder="Room number"
              value={tenantForm.roomNumber}
              onChange={(event) =>
                setTenantForm({ ...tenantForm, roomNumber: event.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Rent amount"
              value={tenantForm.rentAmount}
              onChange={(event) =>
                setTenantForm({ ...tenantForm, rentAmount: event.target.value })
              }
              required
            />
            <input
              type="number"
              placeholder="Electricity rate per unit"
              value={tenantForm.electricityRate}
              onChange={(event) =>
                setTenantForm({ ...tenantForm, electricityRate: event.target.value })
              }
              required
            />
            <button className="primary" type="submit">
              {activeTenant ? "Update tenant" : "Save tenant"}
            </button>
            {activeTenant ? (
              <button
                className="link"
                type="button"
                onClick={() => {
                  setActiveTenant(null);
                  setTenantForm(emptyTenant);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </form>
        </div>
      </section>

      <section className="list">
        <div className="list-header">
          <h2>Tenants</h2>
          {loading ? <span>Loading...</span> : null}
        </div>
        {tenants.length === 0 ? (
          <p className="muted">No tenants yet. Add your first tenant above.</p>
        ) : (
          tenants.map((tenant) => (
            <div className="card" key={tenant.id}>
              <div className="list-row">
                <div>
                  <h3>{tenant.name}</h3>
                  <p className="muted">
                    Room {tenant.roomNumber} · {tenant.phone}
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="link"
                    type="button"
                    onClick={() => {
                      setActiveTenant(tenant);
                      setTenantForm({
                        name: tenant.name,
                        phone: tenant.phone,
                        roomNumber: tenant.roomNumber,
                        rentAmount: tenant.rentAmount,
                        electricityRate: tenant.electricityRate
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button className="link" type="button" onClick={() => handleTenantDelete(tenant.id)}>
                    Delete
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={() => {
                      setActiveTenant(tenant);
                      setRecordForm({
                        ...emptyRecord,
                        rentAmount: tenant.rentAmount,
                        electricityRate: tenant.electricityRate
                      });
                      fetchRecords(tenant.id);
                    }}
                  >
                    Add monthly entry
                  </button>
                </div>
              </div>

              {activeTenant?.id === tenant.id ? (
                <div className="record-panel">
                  <h4>Monthly entry</h4>
                  <form onSubmit={handleRecordSubmit} className="stack">
                    <div className="grid-two">
                      <input
                        type="number"
                        placeholder="Previous meter reading"
                        value={recordForm.previousReading}
                        onChange={(event) =>
                          setRecordForm({ ...recordForm, previousReading: event.target.value })
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Current meter reading"
                        value={recordForm.currentReading}
                        onChange={(event) =>
                          setRecordForm({ ...recordForm, currentReading: event.target.value })
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Rent amount"
                        value={recordForm.rentAmount}
                        onChange={(event) =>
                          setRecordForm({ ...recordForm, rentAmount: event.target.value })
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Electricity rate"
                        value={recordForm.electricityRate}
                        onChange={(event) =>
                          setRecordForm({ ...recordForm, electricityRate: event.target.value })
                        }
                        required
                      />
                      <input
                        type="date"
                        value={recordForm.date}
                        onChange={(event) => setRecordForm({ ...recordForm, date: event.target.value })}
                        required
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setMeterPhoto(event.target.files[0])}
                      />
                    </div>
                    <SignaturePad
                      onChange={(dataUrl) =>
                        setRecordForm((prev) => ({ ...prev, signatureDataUrl: dataUrl }))
                      }
                    />
                    <button className="primary" type="submit">
                      Save entry
                    </button>
                  </form>

                  <div className="records">
                    <h4>History</h4>
                    {(records[tenant.id] || []).length === 0 ? (
                      <p className="muted">No records yet.</p>
                    ) : (
                      (records[tenant.id] || []).map((record) => (
                        <div className="record" key={record.id}>
                          <div>
                            <p className="muted">{record.date}</p>
                            <p>
                              Units {record.unitsUsed} · Electricity ₹{record.electricityBill}
                            </p>
                            <p>Total ₹{record.total}</p>
                          </div>
                          <div className="actions">
                            <button className="link" type="button" onClick={() => handlePaidToggle(record)}>
                              Mark {record.paid ? "unpaid" : "paid"}
                            </button>
                            <button
                              className="link"
                              type="button"
                              onClick={() => handleReceipt(record, tenant)}
                            >
                              Download receipt
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default App;
