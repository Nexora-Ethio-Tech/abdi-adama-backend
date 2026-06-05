#!/bin/bash
# Debugging script for parent clinic chat issue

echo "🔍 Checking parent-student links in database..."

psql -h localhost -U postgres -d abdiadam_school_db -c "
SELECT 
  p.id as parent_id,
  u_p.digital_id as parent_code,
  COUNT(ps.id) as linked_children,
  STRING_AGG(DISTINCT u_s.digital_id, ', ') as student_codes
FROM parents p
LEFT JOIN users u_p ON u_p.id = p.user_id
LEFT JOIN parent_student ps ON ps.parent_id = p.id
LEFT JOIN students s ON s.id = ps.student_id
LEFT JOIN users u_s ON u_s.id = s.user_id
GROUP BY p.id, u_p.digital_id
ORDER BY p.id;
"

echo ""
echo "🔍 Checking clinic chat messages..."

psql -h localhost -U postgres -d abdiadam_school_db -c "
SELECT 
  m.id,
  m.sender_role,
  s.digital_id as student_id,
  u.digital_id as student_name,
  LEFT(m.text, 50) as message_preview,
  m.created_at
FROM clinic_chat_messages m
LEFT JOIN students s ON s.id = m.student_id
LEFT JOIN users u ON u.id = s.user_id
ORDER BY m.created_at DESC
LIMIT 10;
"

echo ""
echo "✅ Check complete"
