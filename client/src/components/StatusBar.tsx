import React, { useState, useEffect } from 'react';

interface StatusBarProps {
  signedIn: boolean;
  agentId: string | null;
  dialect: 'sabre' | 'amadeus';
  currentPnr: string | null;
  hasWorkingPnr: boolean;
  pcc?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  signedIn,
  agentId,
  dialect,
  currentPnr,
  hasWorkingPnr,
  pcc = 'LOS01',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      const utcTime = now.toISOString().substring(11, 16) + 'Z';
      setTimeStr(`${time} / ${utcTime}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="bottom-status-bar" id="terminal-status-bar">
      <div className="status-left">
        <div className="status-item">
          <span>DIALECT:</span>
          <span className={`status-value ${dialect === 'sabre' ? 'text-green' : 'text-cyan'}`}>
            {dialect.toUpperCase()}
          </span>
        </div>

        <div className="status-item">
          <span>AGENT:</span>
          <span className="status-value">
            {signedIn && agentId ? agentId : 'NOT SIGNED IN'}
          </span>
        </div>

        <div className="status-item">
          <span>PNR:</span>
          <span className="status-value">
            {currentPnr ? currentPnr : hasWorkingPnr ? 'IN WORK AREA' : 'NONE'}
          </span>
        </div>
      </div>

      <div className="status-right">
        <div className="status-item">
          <span>PCC:</span>
          <span className="status-value">{pcc}</span>
        </div>
        <div className="status-item">
          <span>SYS TIME:</span>
          <span className="status-value">{timeStr}</span>
        </div>
      </div>
    </footer>
  );
};
