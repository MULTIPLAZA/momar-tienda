// MoMar · Configuración pública de Supabase
//
// Estas son la URL y la ANON KEY del proyecto Supabase de MoMar.
// La ANON KEY está DISEÑADA para ser pública — va en el frontend,
// se ve en cualquier devtools de quien visite el sitio. Está protegida
// por las políticas RLS que limitan qué puede leer/escribir cada rol.
//
// La service_role NUNCA debe aparecer acá ni en ningún archivo del repo.
// Solo va en .env local de la máquina que corre scripts admin (ingest).
window.MOMAR_SUPABASE_URL = 'https://tfpnfkigfvpvuhnxwpij.supabase.co';
window.MOMAR_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcG5ma2lnZnZwdnVobnh3cGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTI3MTEsImV4cCI6MjA5NDQyODcxMX0.gIlRtTF9qPrGACI-xmxjzeWUydU-3U2UVMAl-Nwtvgg';

// Flag: si true, el frontend consume datos de Supabase. Si false, usa mocks de products.js
// Activamos esto recién cuando las migrations + ingesta inicial estén OK.
window.MOMAR_USE_SUPABASE = true;
