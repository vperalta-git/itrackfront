import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AuditTrailTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  axios
    .get('https://itrack-web-backend.onrender.com/api/audit-trail', { withCredentials: true })
    .then((res) => {
      setLogs(res.data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);


  if (loading) return <div>Loading audit trail...</div>;

  // Utility: compare before & after, return only changed fields
  const getChanges = (before, after) => {
    if (!before || !after) return [];

    return Object.keys(after).reduce((changes, key) => {
      if (before[key] !== after[key]) {
        changes.push({ field: key, before: before[key], after: after[key] });
      }
      return changes;
    }, []);
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Audit Trail</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse'}}>

        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Performed By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody >
          {logs.map((log, idx) => {
            const changes = getChanges(log.details?.before, log.details?.after);

            return (
              <tr style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #e3e1e1ff', }} key={idx}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.resource}</td>
                <td>{log.performedBy}</td>
                <td>
    {/* Handle Update (changed fields only) */}
{log.action.toLowerCase() === "update" && changes.length > 0 && (
  <div style={{ fontSize: 12 }}>
    {changes.map((c, i) => (
      <div key={i} style={{ marginBottom: 4 }}>
        <strong>{c.field}:</strong>{' '}
        <span style={{ color: 'red' }}>{c.before}</span> →{' '}
        <span style={{ color: 'green' }}>{c.after}</span>
      </div>
    ))}
  </div>
)}

{/* Handle Create (show new object) */}
{log.action.toLowerCase() === "create" && log.details?.after && (
  <div style={{ fontSize: 12, color: 'green' }}>
    <strong>Created:</strong> {JSON.stringify(log.details.after, null, 2)}
  </div>
)}

{/* Handle Delete (show deleted object) */}
{log.action.toLowerCase() === "delete" && log.details?.before && (
  <div style={{ fontSize: 12, color: 'red' }}>
    <strong>Deleted:</strong> {JSON.stringify(log.details.before, null, 2)}
  </div>
)}

  </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AuditTrailTab;
