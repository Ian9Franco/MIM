-- Agregar columna author a la tabla public.followed_mods si no existe.
-- Esto permite almacenar el creador real de cada mod para sincronización en la nube.
ALTER TABLE public.followed_mods ADD COLUMN IF NOT EXISTS author text;
