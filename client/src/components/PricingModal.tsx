import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import { getPricingConfig, savePricingConfig } from '../api';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getPricingConfig()
        .then((data) => setConfig(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!config) return;
    setLoading(true);
    try {
      await savePricingConfig(config);
      setSavedMessage('Pricing config saved! Takes effect on subsequent WP commands.');
      setTimeout(() => setSavedMessage(''), 4000);
    } catch {
      alert('Failed to save pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <DollarSign size={18} className="text-green" />
            <span>Pricing & Taxes Configuration (pricing-config.json)</span>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {loading && !config ? (
            <div>Loading configuration...</div>
          ) : config ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Adjust fuel surcharges (YQ), taxes, and passenger discounts. Changes immediately affect the <code>WP</code> command.
              </p>

              {/* Fuel Surcharges */}
              <div style={{ background: 'var(--term-surface)', padding: '12px', borderRadius: '6px' }}>
                <h4 style={{ color: 'var(--term-green)', marginBottom: '8px', fontSize: '13px' }}>Fuel Surcharges (YQ)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ fontSize: '12px' }}>
                    Domestic (NGN):
                    <input
                      type="number"
                      value={config.fuelSurcharges?.YQ_DOMESTIC_NGN ?? 25000}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          fuelSurcharges: {
                            ...config.fuelSurcharges,
                            YQ_DOMESTIC_NGN: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      style={{ width: '100%', background: '#050805', color: '#00ff66', border: '1px solid var(--term-border)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}
                    />
                  </label>
                  <label style={{ fontSize: '12px' }}>
                    International (NGN):
                    <input
                      type="number"
                      value={config.fuelSurcharges?.YQ_INTERNATIONAL_NGN ?? 120000}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          fuelSurcharges: {
                            ...config.fuelSurcharges,
                            YQ_INTERNATIONAL_NGN: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      style={{ width: '100%', background: '#050805', color: '#00ff66', border: '1px solid var(--term-border)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}
                    />
                  </label>
                </div>
              </div>

              {/* Taxes */}
              <div style={{ background: 'var(--term-surface)', padding: '12px', borderRadius: '6px' }}>
                <h4 style={{ color: 'var(--term-green)', marginBottom: '8px', fontSize: '13px' }}>Airport Taxes & Charges</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ fontSize: '12px' }}>
                    Passenger Service (QT - NGN):
                    <input
                      type="number"
                      value={config.taxes?.passengerServiceChargeNGN ?? 15000}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          taxes: {
                            ...config.taxes,
                            passengerServiceChargeNGN: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      style={{ width: '100%', background: '#050805', color: '#00ff66', border: '1px solid var(--term-border)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}
                    />
                  </label>
                  <label style={{ fontSize: '12px' }}>
                    Security Charge (NG - NGN):
                    <input
                      type="number"
                      value={config.taxes?.securityChargeNGN ?? 5000}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          taxes: {
                            ...config.taxes,
                            securityChargeNGN: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      style={{ width: '100%', background: '#050805', color: '#00ff66', border: '1px solid var(--term-border)', padding: '4px', borderRadius: '4px', marginTop: '2px' }}
                    />
                  </label>
                </div>
              </div>

              {savedMessage && (
                <div style={{ color: 'var(--term-green)', fontSize: '12px', fontWeight: 'bold' }}>
                  {savedMessage}
                </div>
              )}

              <button
                className="check-button"
                onClick={handleSave}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Save size={16} />
                <span>Save Configuration</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
