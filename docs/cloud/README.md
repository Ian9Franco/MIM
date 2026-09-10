# ☁️ Cloud & Base de Datos (Supabase)

> **¿Qué es esta carpeta?**  
> Contiene la configuración de la infraestructura en la nube de MIM: esquemas de base de datos PostgreSQL, políticas de seguridad Row Level Security (RLS), autenticación y scripts SQL.

---

## 🗄️ Documentación de Infraestructura

- **[supabase.md](./supabase.md)** 📘: Guía maestra de Supabase. Tablas (`profiles`, `drafts`, `collections`, `community_reactions`), políticas RLS con `auth.uid()`, triggers de sincronización y configuración de entorno (`NEXT_PUBLIC_SUPABASE_URL`).
- **[sql/](./sql/)** 📂: Directorio con scripts y migraciones SQL reproducibles para recrear el esquema de base de datos.
