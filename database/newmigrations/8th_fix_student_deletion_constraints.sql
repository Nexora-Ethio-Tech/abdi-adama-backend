-- Fix clinic_chat_messages foreign key referencing students
ALTER TABLE clinic_chat_messages DROP CONSTRAINT IF EXISTS clinic_chat_messages_student_id_fkey;
ALTER TABLE clinic_chat_messages ADD CONSTRAINT clinic_chat_messages_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Fix parents foreign key referencing students
ALTER TABLE parents DROP CONSTRAINT IF EXISTS parents_linked_student_id_fkey;
ALTER TABLE parents ADD CONSTRAINT parents_linked_student_id_fkey 
  FOREIGN KEY (linked_student_id) REFERENCES students(id) ON DELETE SET NULL;
