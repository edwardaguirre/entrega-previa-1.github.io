/**
 * Almacenes globales de Alpine.js (Alpine.store).
 *  - noticias: carga las noticias desde el archivo data/noticias.json (solo lectura).
 *    Las noticias creadas o eliminadas por el usuario (mini CRUD) se guardan en
 *    localStorage y se aplican sobre el contenido del JSON.
 *  - favoritos: lista de ids guardada en localStorage.
 *
 * Para cambiar el contenido base del sitio basta con editar data/noticias.json.
 */
document.addEventListener('alpine:init', () => {
  const URL_JSON = 'data/noticias.json';
  const CLAVE_FAVORITOS = 'pwn_favoritos';
  const CLAVE_CAMBIOS = 'pwn_cambios';

  /* ---------- localStorage seguro (puede fallar en modo privado) ---------- */
  function leerLocal(clave, porDefecto) {
    try {
      const valor = JSON.parse(localStorage.getItem(clave));
      return valor === null ? porDefecto : valor;
    } catch (e) {
      return porDefecto;
    }
  }

  function guardarLocal(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      /* sin almacenamiento disponible: la app sigue funcionando en memoria */
    }
  }

  function cambiosGuardados() {
    const cambios = leerLocal(CLAVE_CAMBIOS, {});
    return {
      creadas: Array.isArray(cambios.creadas) ? cambios.creadas : [],
      eliminadas: Array.isArray(cambios.eliminadas) ? cambios.eliminadas : []
    };
  }

  /** Ruta de la imagen por defecto de una categoría (nombre de archivo sin tildes). */
  function imagenDeCategoria(categoria) {
    return 'assets/img/categoria-' + categoria.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '.svg';
  }

  /* ---------- Almacén de noticias ---------- */
  Alpine.store('noticias', {
    items: [],
    cargando: true,
    error: '',
    base: [], // noticias originales leídas de data/noticias.json

    async init() {
      try {
        let datos;
        try {
          const respuesta = await fetch(URL_JSON, { cache: 'no-store' });
          if (!respuesta.ok) throw new Error('Error ' + respuesta.status);
          datos = await respuesta.json();
        } catch (e) {
          // Con file:// el navegador bloquea fetch: se usa la copia data/noticias.js.
          datos = window.NOTICIAS_RESPALDO;
        }
        if (!Array.isArray(datos)) throw new Error('Formato de JSON inesperado');
        this.base = datos;
        const cambios = cambiosGuardados();
        this.items = this.base.concat(cambios.creadas).filter((n) => !cambios.eliminadas.includes(n.id));
      } catch (e) {
        this.error = 'No se pudo cargar data/noticias.json. Revisa que el archivo exista y tenga un formato JSON válido.';
      } finally {
        this.cargando = false;
      }
    },

    get destacadas() {
      return this.items.filter((n) => n.destacada).slice(0, 3);
    },

    buscar(id) {
      return this.items.find((n) => n.id === Number(id));
    },

    /** Crea una noticia (se guarda en localStorage). `datos` ya viene validado. */
    crear(datos) {
      const cambios = cambiosGuardados();
      const todas = this.base.concat(cambios.creadas);
      const creada = {
        id: todas.reduce((max, n) => Math.max(max, n.id), 0) + 1,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        contenido: datos.contenido,
        categoria: datos.categoria,
        imagen: imagenDeCategoria(datos.categoria),
        autor: datos.autor || 'Redacción',
        fecha: new Date().toISOString().slice(0, 10),
        destacada: false
      };
      cambios.creadas.push(creada);
      guardarLocal(CLAVE_CAMBIOS, cambios);
      this.items.push(creada);
      return creada;
    },

    /** Elimina una noticia y la quita también de favoritos. */
    eliminar(id) {
      const cambios = cambiosGuardados();
      cambios.creadas = cambios.creadas.filter((n) => n.id !== id);
      if (this.base.some((n) => n.id === id) && !cambios.eliminadas.includes(id)) cambios.eliminadas.push(id);
      guardarLocal(CLAVE_CAMBIOS, cambios);
      this.items = this.items.filter((n) => n.id !== id);
      Alpine.store('favoritos').quitar(id);
    },

    /** Formatea una fecha ISO (AAAA-MM-DD) en español. */
    fecha(iso) {
      const f = new Date(iso + 'T00:00:00');
      return isNaN(f) ? '' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  });

  /* ---------- Almacén de favoritos ---------- */
  Alpine.store('favoritos', {
    ids: [],

    init() {
      const guardados = leerLocal(CLAVE_FAVORITOS, []);
      this.ids = Array.isArray(guardados) ? guardados.filter(Number.isInteger) : [];
    },

    tiene(id) {
      return this.ids.includes(id);
    },

    agregar(id) {
      if (!this.tiene(id)) {
        this.ids.push(id);
        guardarLocal(CLAVE_FAVORITOS, this.ids);
      }
    },

    quitar(id) {
      this.ids = this.ids.filter((x) => x !== id);
      guardarLocal(CLAVE_FAVORITOS, this.ids);
    },

    alternar(id) {
      if (this.tiene(id)) this.quitar(id);
      else this.agregar(id);
    }
  });
});
