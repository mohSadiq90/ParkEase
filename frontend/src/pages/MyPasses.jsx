import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function MyPasses() {
  const { user } = useAuth();
  const [activePassesData, setActivePassesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);

  // Form State
  const [passType, setPassType] = useState(0); // 0: Monthly, 1: Weekly
  const [coverageType, setCoverageType] = useState('space'); // 'space' or 'zone'
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [usageMode, setUsageMode] = useState(0); // 0: Unlimited, 1: LimitedHours
  const [dailyHourLimit, setDailyHourLimit] = useState(8);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const fetchPasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMyActivePasses();
      if (res?.success) {
        setActivePassesData(res.data);
      }
    } catch (err) {
      console.error('Failed to load active passes:', err);
      toast.error('Failed to load parking passes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const openBuyModal = async () => {
    setShowBuyModal(true);
    if (parkingSpaces.length === 0) {
      try {
        setLoadingSpaces(true);
        const res = await api.searchParking({ pageNumber: 1, pageSize: 20 });
        if (res?.success && res.data?.items) {
          setParkingSpaces(res.data.items);
          if (res.data.items.length > 0) {
            setSelectedSpaceId(res.data.items[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching parking spaces for passes:', err);
      } finally {
        setLoadingSpaces(false);
      }
    }
  };

  const calculateEndDate = (start, type) => {
    const d = new Date(start);
    if (type === 1) {
      // Weekly
      d.setDate(d.getDate() + 7);
    } else {
      // Monthly (30 days)
      d.setDate(d.getDate() + 30);
    }
    return d.toISOString();
  };

  const handlePurchasePass = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const startUtc = new Date(startDate).toISOString();
      const endUtc = calculateEndDate(startDate, passType);

      const payload = {
        passType: Number(passType),
        startDateUtc: startUtc,
        endDateUtc: endUtc,
        parkingSpaceId: coverageType === 'space' && selectedSpaceId ? selectedSpaceId : null,
        parkingZoneCode: coverageType === 'zone' && zoneCode ? zoneCode.trim() : null,
        usageMode: Number(usageMode),
        dailyHourLimit: Number(usageMode) === 1 ? Number(dailyHourLimit) : null,
        discountPercentage: passType === 0 ? 25 : 15,
      };

      const res = await api.createPass(payload);
      if (res?.success) {
        toast.success('Parking Pass successfully activated!');
        setShowBuyModal(false);
        fetchPasses();
      } else {
        toast.error(res?.message || 'Failed to activate pass');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create pass';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const passesList = activePassesData?.activePasses || [];

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.1))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '1.75rem 2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🎫</span> My Parking Passes
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Enjoy unlimited seamless entries, priority spots, and up to 25% discount with active parking subscriptions.
          </p>
        </div>
        <button
          onClick={openBuyModal}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.75rem 1.4rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span>✨</span> Get New Pass
        </button>
      </div>

      {/* Passes Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading your parking passes...</p>
        </div>
      ) : passesList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💳</div>
          <h3 style={{ fontSize: '1.25rem', color: '#f1f5f9', marginBottom: '0.5rem' }}>No Active Passes Found</h3>
          <p style={{ color: '#94a3b8', maxWidth: '460px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
            You do not currently have any active parking passes. Get a weekly or monthly pass to save on regular commutes and enjoy automatic barrier access.
          </p>
          <button
            onClick={openBuyModal}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem' }}
          >
            Explore Pass Plans
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {passesList.map((pass) => {
            const passTypeNames = ['Monthly Pass', 'Weekly Pass', 'Corporate Pass'];
            const typeLabel = passTypeNames[pass.passType] || 'Pass';
            const isMonthly = pass.passType === 0;
            const isCorporate = pass.passType === 2;
            const startDateFormatted = new Date(pass.startDateUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const endDateFormatted = new Date(pass.endDateUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={pass.id}
                style={{
                  background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
              >
                {/* Accent Top Bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: isCorporate
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : isMonthly
                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                    : 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                }} />

                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                  <div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: isCorporate ? '#34d399' : isMonthly ? '#a78bfa' : '#60a5fa',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}>
                      {typeLabel}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0.5rem 0 0', fontWeight: '600' }}>
                      {pass.parkingSpaceTitle || (pass.parkingZoneCode ? `Zone: ${pass.parkingZoneCode}` : 'All Spaces')}
                    </h3>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: pass.isActive ? '#10b981' : '#94a3b8',
                    background: pass.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                    border: `1px solid ${pass.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: pass.isActive ? '#10b981' : '#94a3b8' }}></span>
                    {pass.isActive ? 'Active' : 'Expired'}
                  </span>
                </div>

                {/* Details list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Validity Period:</span>
                    <span style={{ fontWeight: '500' }}>{startDateFormatted} – {endDateFormatted}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Access Mode:</span>
                    <span style={{ fontWeight: '500' }}>
                      {pass.usageMode === 0 ? 'Unlimited Entries' : `${pass.dailyHourLimit || 8}h / Day Max`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Discount Tier:</span>
                    <span style={{ color: '#34d399', fontWeight: '600' }}>{pass.discountPercentage}% Off</span>
                  </div>

                  {pass.corporateBatchReference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Corporate Ref:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#93c5fd' }}>{pass.corporateBatchReference}</span>
                    </div>
                  )}
                </div>

                {/* Digital Barcode / Access Code Simulation */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Digital Pass ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#e2e8f0', letterSpacing: '0.05em' }}>
                      {pass.id.substring(0, 16).toUpperCase()}...
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem' }}>📲</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Pass Modal */}
      {showBuyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                Activate Parking Pass
              </h2>
              <button
                onClick={() => setShowBuyModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePurchasePass}>
              {/* Pass Tier Selection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  Select Pass Plan
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setPassType(0)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: `2px solid ${passType === 0 ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                      background: passType === 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#f8fafc' }}>Monthly Pass</div>
                    <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px' }}>Save 25%</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>30 Days Validity</div>
                  </div>

                  <div
                    onClick={() => setPassType(1)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: `2px solid ${passType === 1 ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                      background: passType === 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '700', color: '#f8fafc' }}>Weekly Pass</div>
                    <div style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '4px' }}>Save 15%</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>7 Days Validity</div>
                  </div>
                </div>
              </div>

              {/* Coverage Type */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  Coverage Scope
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="coverage"
                      checked={coverageType === 'space'}
                      onChange={() => setCoverageType('space')}
                    />
                    Specific Parking Space
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="coverage"
                      checked={coverageType === 'zone'}
                      onChange={() => setCoverageType('zone')}
                    />
                    City Parking Zone
                  </label>
                </div>

                {coverageType === 'space' ? (
                  loadingSpaces ? (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Loading parking locations...</div>
                  ) : (
                    <select
                      value={selectedSpaceId}
                      onChange={(e) => setSelectedSpaceId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="">Any Available Space</option>
                      {parkingSpaces.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.title} ({sp.address})
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    type="text"
                    placeholder="Enter zone code (e.g. ZONE-DOWNTOWN-A)"
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                )}
              </div>

              {/* Usage Mode */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  Daily Usage Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => setUsageMode(0)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${usageMode === 0 ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                      background: usageMode === 0 ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#f8fafc',
                      textAlign: 'center'
                    }}
                  >
                    🚀 Unlimited Access
                  </div>
                  <div
                    onClick={() => setUsageMode(1)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${usageMode === 1 ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                      background: usageMode === 1 ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      color: '#f8fafc',
                      textAlign: 'center'
                    }}
                  >
                    ⏱️ Capped Daily Hours
                  </div>
                </div>
                {usageMode === 1 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                      Max Hours Per Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={dailyHourLimit}
                      onChange={(e) => setDailyHourLimit(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Start Date */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  Pass Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#cbd5e1',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  {submitting ? 'Activating Pass...' : 'Confirm & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
