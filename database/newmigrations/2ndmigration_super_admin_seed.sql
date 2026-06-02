-- Seed super-admin user if no super-admin exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'super-admin') THEN
    INSERT INTO public.users (
      name, email, password_hash, role, digital_id, status
    ) VALUES (
      'SUPER-ADMIN', 
      'abdiadamaschooloffice@gmail.com', 
      '$2a$12$OPPdSZBzk56MXIHrYhTo0eYX8KHCOQD8kotlmMqpqpqcslOwlpU/a', 
      'super-admin', 
      'SA-001', 
      'Active'
    );
  END IF;
END $$;
