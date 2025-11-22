// Test audit trail integration
const API_BASE_URL = 'http://localhost:3000'; // Update to your backend URL

async function testAuditTrailEndpoint() {
  try {
    console.log('🧪 Testing audit trail endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/api/audit-trail`);
    const auditTrails = await response.json();
    
    console.log('✅ Response received:', {
      isArray: Array.isArray(auditTrails),
      length: auditTrails.length,
      sampleData: auditTrails.slice(0, 2)
    });
    
    if (Array.isArray(auditTrails) && auditTrails.length > 0) {
      const firstTrail = auditTrails[0];
      console.log('📊 First audit trail structure:', {
        hasTimestamp: !!firstTrail.timestamp,
        hasAction: !!firstTrail.action,
        hasResource: !!firstTrail.resource,
        hasPerformedBy: !!firstTrail.performedBy,
        hasDetails: !!firstTrail.details,
        hasBefore: !!firstTrail.details?.before,
        hasAfter: !!firstTrail.details?.after,
        detailsKeys: firstTrail.details ? Object.keys(firstTrail.details) : []
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAuditTrailEndpoint();