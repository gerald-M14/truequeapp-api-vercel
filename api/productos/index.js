// /api/productos/index.js
// GET /api/productos
// GET /api/productos?categoria=<id_categoria>

const productos = [
  {
    id_producto: 1,
    titulo: "Cámara Vintage Canon AE-1",
    descripcion: "Cámara analógica en excelente estado, incluye lente 50mm y correa original.",
    categoria_id: 1,
    categoria_nombre: "Tecnología",
    imagen_principal: "https://images.unsplash.com/photo-1519181245277-cffeb31da2fb?q=80&w=1200&auto=format&fit=crop",
    imagenes_extra: [
      "https://images.unsplash.com/photo-1519181972211-03d2c55308f1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502741509793-7f93c1b6d2b5?q=80&w=1200&auto=format&fit=crop"
    ],
    usuario_nombre: "Carlos M.",
    avatar_usuario: "https://i.pravatar.cc/100?img=12",
    ubicacion: "Madrid, España",
    likes: 24,
    dias_publicado: 2,
    anio_miembro: 2022
  },
  {
    id_producto: 2,
    titulo: "Skateboard Completo",
    descripcion: "Skate profesional con trucks Independent y ruedas Spitfire. Poco uso.",
    categoria_id: 2,
    categoria_nombre: "Deportes",
    imagen_principal: "https://images.unsplash.com/photo-1483721310020-03333e577078?q=80&w=1200&auto=format&fit=crop",
    imagenes_extra: [],
    usuario_nombre: "Ana R.",
    avatar_usuario: "https://i.pravatar.cc/100?img=32",
    ubicacion: "Barcelona, España",
    likes: 18,
    dias_publicado: 5,
    anio_miembro: 2021
  },
  {
    id_producto: 3,
    titulo: "Reloj Vintage Omega",
    descripcion: "Reloj mecánico de los años 70 en perfecto funcionamiento. Correa de cuero.",
    categoria_id: 5,
    categoria_nombre: "Moda",
    imagen_principal: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1200&auto=format&fit=crop",
    imagenes_extra: [],
    usuario_nombre: "Miguel A.",
    avatar_usuario: "https://i.pravatar.cc/100?img=56",
    ubicacion: "Valencia, España",
    likes: 31,
    dias_publicado: 1,
    anio_miembro: 2020
  }
];

export default function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Método no permitido" });
      return;
    }

    const { categoria } = req.query; // puede ser "all" o id numérico/string
    let data = productos;

    if (categoria && categoria !== "all") {
      const catId = Number(categoria);
      data = productos.filter(p => p.categoria_id === catId);
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: "Error interno", detail: String(e) });
  }
}
