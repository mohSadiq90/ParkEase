import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AvailabilityForecastWidget({ parkingSpaceId, totalSpots = 1, compact = false }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horizonHours, setHorizonHours] = useState(24);

  useEffect(() => {
    if (!parkingSpaceId) return;

    let isMounted = true;
    const loadForecast = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getParkingAvailabilityForecast(parkingSpaceId, { horizonHours, intervalMinutes: 60 });
        if (res?.success && res.data && isMounted) {
          setForecast(res.data);
        } else if (isMounted) {
          setError('Forecast unavailable');
        }
      } catch (err) {
        if (isMounted) {
          setError('Occupancy forecast not currently available for this location.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadForecast();
    return () => { isMounted = false; };
  }, [parkingSpaceId, horizonHours]);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '1.25rem',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.85rem'
      }}>
        <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto 8px' }}></div>
        Calculating spot availability prediction...
      </div>
    );
  }

  if (error || !forecast || !forecast.Buckets || forecast.Buckets.length === 0) {
    return null; // Gracefully degrade if unavailable
  }

  const buckets = forecast.Buckets.slice(0, compact ? 8 : 16);
  const currentBand = forecast.CurrentAvailabilityBand || 'High';
  const bandColors = {
    High: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)', label: 'High Availability' },
    Moderate: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', label: 'Moderate Demand' },
    Low: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', label: 'Low Availability' },
    Full: { bg: 'rgba(225, 29, 72, 0.2)', text: '#f43f5e', border: 'rgba(225, 29, 72, 0.4)', label: 'Nearly Full' },
  };
  const currentStyle = bandColors[currentBand] || bandColors.High;

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      marginTop: '1rem',
      marginBottom: '1.25rem'
    }}>
      {/* Top Title & Live Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🔮</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc' }}>
              Spot Availability Forecast
            </h4>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              AI & booking-calendar occupancy prediction
            </div>
          </div>
        </div>

        <span style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          padding: '4px 10px',
          borderRadius: '999px',
          background: currentStyle.bg,
          color: currentStyle.text,
          border: `1px solid ${currentStyle.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentStyle.text }}></span>
          {currentStyle.label}
        </span>
      </div>

      {/* Forecast Metric Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '0.6rem 0.75rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Expected Free Spots</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }}>
            {forecast.CurrentPredictedAvailableSpots ?? (totalSpots - forecast.CurrentPredictedBookedSpots)} / {forecast.TotalSpots || totalSpots}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '0.6rem 0.75rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Peak Booked Period</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }}>
            {forecast.PeakPredictedBookedSpotsAcrossForecast || 0} spots
          </div>
        </div>

        {!compact && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Forecast Confidence</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
              {Math.round((forecast.CurrentConfidenceScore || 0.85) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Hourly Timeline Bars */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>Hourly Occupancy Projection</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Next {buckets.length} hours</span>
        </div>

        <div style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'flex-end',
          height: '60px',
          paddingTop: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '4px'
        }}>
          {buckets.map((b, idx) => {
            const timeStr = new Date(b.StartDateTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const occRate = Math.min(100, Math.max(0, Math.round((b.PredictedOccupancyRate || 0) * 100)));
            const barColor = occRate > 80 ? '#ef4444' : occRate > 50 ? '#f59e0b' : '#10b981';
            const barHeight = Math.max(12, Math.round((occRate / 100) * 44));

            return (
              <div
                key={idx}
                title={`${timeStr}: ~${occRate}% Occupied (${b.PredictedAvailableSpots} free)`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '100%',
                  height: `${barHeight}px`,
                  backgroundColor: barColor,
                  borderRadius: '3px 3px 1px 1px',
                  opacity: b.IsLiveWindow ? 1 : 0.8,
                  border: b.IsLiveWindow ? '1px solid #fff' : 'none',
                  transition: 'height 0.2s, transform 0.2s',
                }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: '#64748b' }}>
          <span>Now ({new Date(buckets[0]?.StartDateTimeUtc || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
          <span>+{(buckets.length)}h</span>
        </div>
      </div>
    </div>
  );
}
