/**
 * Componentes de Alpine.js (Alpine.data), uno por vista.
 * En el HTML solo se referencian por nombre: x-data="listado", x-data="contacto", etc.
 */
document.addEventListener('alpine:init', () => {
  const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const CATEGORIAS = ['Educativa', 'Tecnológica', 'Turística', 'Comercial'];

  /* ---------- Listado de noticias: eliminar (mini CRUD) ---------- */
  Alpine.data('listado', () => ({
    errorEliminar: '',

    async eliminar(noticia) {
      this.errorEliminar = '';
      if (!window.confirm('¿Eliminar la noticia "' + noticia.titulo + '"?')) return;
      try {
        await this.$store.noticias.eliminar(noticia.id);
      } catch (e) {
        this.errorEliminar = 'No se pudo eliminar la noticia: ' + e.message;
      }
    }
  }));

  /* ---------- Modal "Nueva noticia": crear (mini CRUD) ---------- */
  Alpine.data('formNoticia', () => ({
    abierto: false,
    enviando: false,
    intentado: false,
    errorGeneral: '',
    exito: '',
    categorias: CATEGORIAS,
    campos: { titulo: '', descripcion: '', contenido: '', categoria: '', autor: '' },
    errores: {},

    abrir() {
      this.exito = '';
      this.errorGeneral = '';
      this.abierto = true;
      document.body.classList.add('modal-open');
    },

    cerrar() {
      this.abierto = false;
      document.body.classList.remove('modal-open');
    },

    validar() {
      const c = this.campos;
      const errores = {};
      if (c.titulo.trim().length < 5) errores.titulo = 'El título es obligatorio (mínimo 5 caracteres).';
      if (c.descripcion.trim().length < 10) errores.descripcion = 'La descripción breve es obligatoria (mínimo 10 caracteres).';
      if (c.contenido.trim().length < 20) errores.contenido = 'El contenido es obligatorio (mínimo 20 caracteres).';
      if (!CATEGORIAS.includes(c.categoria)) errores.categoria = 'Selecciona una categoría.';
      return errores;
    },

    revalidar() {
      if (this.intentado) this.errores = this.validar();
    },

    async enviar() {
      this.intentado = true;
      this.errorGeneral = '';
      this.errores = this.validar();
      if (Object.keys(this.errores).length > 0) return;
      this.enviando = true;
      try {
        const creada = await this.$store.noticias.crear({
          titulo: this.campos.titulo.trim(),
          descripcion: this.campos.descripcion.trim(),
          contenido: this.campos.contenido.trim(),
          categoria: this.campos.categoria,
          autor: this.campos.autor.trim()
        });
        this.campos = { titulo: '', descripcion: '', contenido: '', categoria: '', autor: '' };
        this.errores = {};
        this.intentado = false;
        this.cerrar();
        this.exito = 'La noticia "' + creada.titulo + '" fue creada correctamente.';
      } catch (e) {
        this.errorGeneral = 'No se pudo crear la noticia: ' + e.message;
      } finally {
        this.enviando = false;
      }
    }
  }));

  /* ---------- Detalle de la noticia ---------- */
  Alpine.data('detalle', () => ({
    id: Number(new URLSearchParams(window.location.search).get('id')),
    aviso: '',

    init() {
      // Actualiza el título de la pestaña cuando la noticia ya está cargada.
      this.$watch('noticia', (n) => {
        if (n) document.title = n.titulo + ' | Plataforma Web de Noticias';
      });
    },

    get noticia() {
      return this.$store.noticias.buscar(this.id);
    },

    get esFavorita() {
      return this.$store.favoritos.tiene(this.id);
    },

    alternarFavorito() {
      this.$store.favoritos.alternar(this.id);
      this.aviso = this.esFavorita ? 'La noticia se agregó a tus favoritos.' : 'La noticia se quitó de tus favoritos.';
    }
  }));

  /* ---------- Favoritos ---------- */
  Alpine.data('paginaFavoritos', () => ({
    get lista() {
      const ids = this.$store.favoritos.ids;
      return this.$store.noticias.items.filter((n) => ids.includes(n.id));
    }
  }));

  /* ---------- Contacto: validaciones y mensaje de confirmación ---------- */
  Alpine.data('contacto', () => ({
    campos: { nombre: '', correo: '', mensaje: '' },
    errores: {},
    intentado: false,
    enviado: false,

    validar() {
      const c = this.campos;
      const errores = {};
      if (c.nombre.trim() === '') errores.nombre = 'El nombre es obligatorio.';
      if (c.correo.trim() === '') errores.correo = 'El correo electrónico es obligatorio.';
      else if (!REGEX_CORREO.test(c.correo.trim())) errores.correo = 'Ingresa un correo electrónico válido (ejemplo: nombre@dominio.com).';
      if (c.mensaje.trim() === '') errores.mensaje = 'El mensaje es obligatorio.';
      return errores;
    },

    revalidar() {
      if (this.intentado) this.errores = this.validar();
    },

    enviar() {
      this.intentado = true;
      this.errores = this.validar();
      if (Object.keys(this.errores).length > 0) {
        this.enviado = false;
        return;
      }
      this.enviado = true;
      this.campos = { nombre: '', correo: '', mensaje: '' };
      this.errores = {};
      this.intentado = false;
    }
  }));
});
