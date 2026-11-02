-- Permisos de la guía de uso (0022). Cada persona marca lo que vio y puede
-- volver a verla (seen_at en nulo). Sin DELETE (E6).
GRANT SELECT, INSERT ON user_onboarding TO r360_app;
--> statement-breakpoint
GRANT UPDATE (seen_at) ON user_onboarding TO r360_app;
