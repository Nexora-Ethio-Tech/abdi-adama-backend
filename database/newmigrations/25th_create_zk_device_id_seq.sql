-- Create the sequence if it doesn't already exist
CREATE SEQUENCE IF NOT EXISTS public.zk_device_id_seq;

-- Dynamically set its starting value to 1 higher than the maximum existing numeric zk_device_id
SELECT setval(
  'public.zk_device_id_seq', 
  COALESCE(
    (SELECT MAX(CAST(zk_device_id AS INTEGER)) 
     FROM public.users 
     WHERE zk_device_id ~ '^[0-9]+$'), 
    0
  ) + 1, 
  false
);
