/**
 * Test Cleanup Helper
 * Deletes all test data from the production database after test runs.
 * This prevents test data from polluting the production database.
 */
import mysql from 'mysql2/promise';

export async function cleanupTestData() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('[Test Cleanup] No DATABASE_URL, skipping cleanup');
    return;
  }
  
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(dbUrl);
    
    // Delete child tables first (foreign key constraints)
    await conn.execute('DELETE FROM campaign_contributions WHERE contributorEmail LIKE "%@example%" OR title LIKE "%test%" OR title LIKE "%Test%" OR title LIKE "%Contribution%" OR title LIKE "%Volunteer%" OR title LIKE "%Tractor%" OR title LIKE "%Land Contribution%"');
    
    await conn.execute('DELETE FROM campaign_items WHERE campaignId IN (SELECT id FROM campaigns WHERE title LIKE "%test%" OR title LIKE "%Test%" OR title LIKE "%Validation%" OR title LIKE "%Filter%" OR title LIKE "%Query%" OR title LIKE "%Accept%" OR title LIKE "%Reject%")');
    
    await conn.execute('DELETE FROM campaign_analytics WHERE campaignId IN (SELECT id FROM campaigns WHERE title LIKE "%test%" OR title LIKE "%Test%" OR title LIKE "%Validation%" OR title LIKE "%Filter%" OR title LIKE "%Query%" OR title LIKE "%Accept%" OR title LIKE "%Reject%")');
    
    await conn.execute('DELETE FROM campaigns WHERE title LIKE "%test%" OR title LIKE "%Test%" OR title LIKE "%Validation%" OR title LIKE "%Filter%" OR title LIKE "%Query%" OR title LIKE "%Accept%" OR title LIKE "%Reject%"');
    
    await conn.execute('DELETE FROM reviews WHERE applicationId IN (SELECT id FROM applications WHERE projectName LIKE "%test%" OR projectName LIKE "%Test%" OR projectName LIKE "%Workflow%" OR projectName LIKE "%My Project%")');
    
    await conn.execute('DELETE FROM applications WHERE projectName LIKE "%test%" OR projectName LIKE "%Test%" OR projectName LIKE "%Workflow%" OR projectName LIKE "%My Project%" OR projectName LIKE "%Minimal%" OR projectName LIKE "%Example%"');
    
    await conn.execute('DELETE FROM investor_inquiries WHERE email LIKE "%@example%" OR fullName LIKE "%Test%" OR fullName LIKE "%Minimal%"');
    
    await conn.execute('DELETE FROM general_inquiries WHERE email LIKE "%@example%" OR fullName LIKE "%Creative Partner%" OR fullName LIKE "%Alliance Org%" OR fullName LIKE "%Future Resident%" OR fullName LIKE "%Role Applicant%" OR fullName LIKE "%Unique Contributor%"');
    
    await conn.execute('DELETE FROM email_logs WHERE recipientEmail LIKE "%@example%"');
    
    await conn.execute('DELETE FROM user_notifications WHERE userId = 999999 OR userId = 999998');
    
    console.log('[Test Cleanup] All test data removed from database');
  } catch (error) {
    console.error('[Test Cleanup] Error cleaning up test data:', error);
  } finally {
    if (conn) await conn.end();
  }
}
