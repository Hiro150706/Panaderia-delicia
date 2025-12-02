/* auth.js
   Sistema de autenticación con Supabase
*/

// ============================================
// CONFIGURACIÓN SUPABASE
// ============================================
const SUPABASE_URL = 'https://ntmqhlozwedzoaozjcvq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXFobG96d2Vkem9hb3pqY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NDE1OTcsImV4cCI6MjA4MDIxNzU5N30.kBFmWikurhhVZ2Qh6GwdaiO2wzdZgEH_GJ_sLbroRcA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// CLASE DE AUTENTICACIÓN
// ============================================
class Auth {
  constructor() {
    this.SESSION_KEY = 'user_session';
  }

  // Guardar sesión
  saveSession(user) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    console.log('✅ Sesión guardada:', user);
  }

  // Obtener sesión
  getSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }

  // Verificar si está autenticado
  isAuthenticated() {
    return this.getSession() !== null;
  }

  // Cerrar sesión
  logout() {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem('cart'); // Limpiar carrito también
    window.location.href = 'login.html';
  }

  // Login
  async login(email, password) {
    try {
      console.log('🔐 Intentando login:', email);

      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Buscar usuario por email
      const { data: users, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('activo', true);

      if (error) {
        console.error('Error en consulta:', error);
        throw error;
      }

      if (!users || users.length === 0) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      const user = users[0];

      // Comparar contraseña
      if (user.password !== password) {
        throw new Error('Contraseña incorrecta');
      }

      console.log('✅ Login exitoso:', user);

      // Guardar sesión
      this.saveSession(user);

      return user;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }

  // Registro
  async register(email, password, nombre, telefono = '', direccion = '') {
    try {
      console.log('📝 Registrando usuario:', email);

      if (!email || !password || !nombre) {
        throw new Error('Email, contraseña y nombre son requeridos');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Verificar si ya existe
      const { data: existing, error: checkError } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email);

      if (checkError) {
        console.error('Error al verificar email:', checkError);
        throw checkError;
      }

      if (existing && existing.length > 0) {
        throw new Error('El email ya está registrado');
      }

      // Crear usuario (rol por defecto: cliente)
      const { data: newUser, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          email: email,
          password: password,
          nombre: nombre,
          telefono: telefono || null,
          direccion: direccion || null,
          rol: 'cliente',
          activo: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error al insertar usuario:', insertError);
        throw insertError;
      }

      console.log('✅ Usuario registrado:', newUser);

      // Guardar sesión
      this.saveSession(newUser);

      return newUser;
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  }

  // Redirigir según rol
  redirectByRole() {
    const session = this.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    console.log('🔀 Redirigiendo según rol:', session.rol);

    switch (session.rol) {
      case 'admin':
        window.location.href = 'dashboard-admin.html';
        break;
      case 'empleado':
        window.location.href = 'dashboard-empleado.html';
        break;
      case 'cliente':
        window.location.href = 'product.html';
        break;
      default:
        window.location.href = 'index.html';
    }
  }

  // Verificar permisos
  hasRole(roles) {
    const session = this.getSession();
    if (!session) return false;

    if (Array.isArray(roles)) {
      return roles.includes(session.rol);
    }
    return session.rol === roles;
  }

  // Middleware para proteger páginas
  requireAuth(allowedRoles = []) {
    if (!this.isAuthenticated()) {
      console.log('⚠️ Usuario no autenticado, redirigiendo a login');
      window.location.href = 'login.html';
      return false;
    }

    if (allowedRoles.length > 0 && !this.hasRole(allowedRoles)) {
      alert('No tienes permisos para acceder a esta página');
      this.redirectByRole();
      return false;
    }

    return true;
  }
}

// Instancia global
window.auth = new Auth();

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.auth;
}

console.log('✅ Sistema de autenticación inicializado');